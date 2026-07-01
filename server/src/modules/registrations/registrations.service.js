const db = require('../../config/db');
const ticketsService = require('../tickets/tickets.service');

const register = async (userId, { eventId, members }) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const eventRes = await client.query(
      'SELECT id, capacity, title, status FROM events WHERE id = $1 FOR UPDATE',
      [eventId]
    );
    if (eventRes.rows.length === 0) {
      const error = new Error('Event not found');
      error.statusCode = 404;
      throw error;
    }
    const event = eventRes.rows[0];
    if (event.status !== 'published') {
      const error = new Error('Event is not open for registration');
      error.statusCode = 400;
      throw error;
    }

    await client.query(
      "DELETE FROM registrations WHERE user_id = $1 AND event_id = $2 AND status = 'cancelled'",
      [userId, eventId]
    );

    const existingRes = await client.query(
      'SELECT id, status FROM registrations WHERE user_id = $1 AND event_id = $2',
      [userId, eventId]
    );
    if (existingRes.rows.length > 0) {
      const error = new Error('Already registered for this event');
      error.statusCode = 400;
      throw error;
    }

    const regCountRes = await client.query(
      "SELECT COUNT(*) as count FROM registrations WHERE event_id = $1 AND status = 'confirmed'",
      [eventId]
    );
    const memCountRes = await client.query(
      "SELECT COUNT(rm.id) as count FROM registration_members rm JOIN registrations r ON rm.registration_id = r.id WHERE r.event_id = $1 AND r.status = 'confirmed'",
      [eventId]
    );

    const regCount = parseInt(regCountRes.rows[0].count, 10);
    const memCount = parseInt(memCountRes.rows[0].count, 10);
    const currentConfirmedSpots = regCount + memCount;

    const requestedSpots = 1 + (members ? members.length : 0);
    let status = 'confirmed';
    if (currentConfirmedSpots + requestedSpots > event.capacity) {
      status = 'waitlisted';
    }

    const registrationRes = await client.query(
      'INSERT INTO registrations (event_id, user_id, status) VALUES ($1, $2, $3) RETURNING *',
      [eventId, userId, status]
    );
    const registration = registrationRes.rows[0];

    const insertedMembers = [];
    if (members && members.length > 0) {
      for (const m of members) {
        const memRes = await client.query(
          'INSERT INTO registration_members (registration_id, name, email) VALUES ($1, $2, $3) RETURNING *',
          [registration.id, m.name, m.email]
        );
        insertedMembers.push(memRes.rows[0]);
      }
    }

    let ticket = null;
    if (status === 'confirmed') {
      ticket = await ticketsService.generateTicket(registration.id, client);
      const msg = `Your registration for event "${event.title}" is confirmed.`;
      await client.query(
        "INSERT INTO notifications (user_id, message, type, event_id) VALUES ($1, $2, 'registration_confirmed', $3)",
        [userId, msg, eventId]
      );
    } else {
      const msg = `You have been added to the waitlist for event "${event.title}".`;
      await client.query(
        "INSERT INTO notifications (user_id, message, type, event_id) VALUES ($1, $2, 'waitlist_joined', $3)",
        [userId, msg, eventId]
      );
    }

    await client.query('COMMIT');
    return {
      ...registration,
      members: insertedMembers,
      ticket
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const cancelRegistration = async (registrationId, userId) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const regRes = await client.query(
      'SELECT id, event_id, user_id, status FROM registrations WHERE id = $1 FOR UPDATE',
      [registrationId]
    );
    if (regRes.rows.length === 0) {
      const error = new Error('Registration not found');
      error.statusCode = 404;
      throw error;
    }
    const registration = regRes.rows[0];

    const eventRes = await client.query('SELECT title, organizer_id FROM events WHERE id = $1', [registration.event_id]);
    const event = eventRes.rows[0];

    const userRoleRes = await client.query('SELECT roles FROM users WHERE id = $1', [userId]);
    const roles = userRoleRes.rows[0]?.roles || [];
    const isOwner = registration.user_id === userId;
    const isOrganizer = event.organizer_id === userId;
    const isAdmin = roles.includes('admin');

    if (!isOwner && !isOrganizer && !isAdmin) {
      const error = new Error('Forbidden: Cannot cancel this registration');
      error.statusCode = 403;
      throw error;
    }

    if (registration.status === 'cancelled') {
      await client.query('COMMIT');
      return { message: 'Registration already cancelled' };
    }

    const previousStatus = registration.status;

    await client.query(
      "UPDATE registrations SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [registrationId]
    );

    await client.query('DELETE FROM tickets WHERE registration_id = $1', [registrationId]);

    if (previousStatus === 'confirmed') {
      const membersCountRes = await client.query(
        'SELECT COUNT(*) as count FROM registration_members WHERE registration_id = $1',
        [registrationId]
      );
      let spotsFreed = 1 + parseInt(membersCountRes.rows[0].count, 10);

      const waitlistRes = await client.query(
        "SELECT id, user_id FROM registrations WHERE event_id = $1 AND status = 'waitlisted' ORDER BY created_at ASC FOR UPDATE",
        [registration.event_id]
      );

      for (const wlReg of waitlistRes.rows) {
        const wlMemCountRes = await client.query(
          'SELECT COUNT(*) as count FROM registration_members WHERE registration_id = $1',
          [wlReg.id]
        );
        const spotsNeeded = 1 + parseInt(wlMemCountRes.rows[0].count, 10);

        if (spotsNeeded <= spotsFreed) {
          await client.query(
            "UPDATE registrations SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [wlReg.id]
          );
          await ticketsService.generateTicket(wlReg.id, client);

          const promoMsg = `You have been promoted from the waitlist for event "${event.title}". Your registration is now confirmed.`;
          await client.query(
            "INSERT INTO notifications (user_id, message, type, event_id) VALUES ($1, $2, 'waitlist_promotion', $3)",
            [wlReg.user_id, promoMsg, registration.event_id]
          );

          spotsFreed -= spotsNeeded;
          if (spotsFreed <= 0) {
            break;
          }
        }
      }
    }

    await client.query('COMMIT');
    return { message: 'Registration cancelled successfully' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const listMyRegistrations = async (userId) => {
  const res = await db.query(
    `SELECT r.*, e.title as event_title, e.start_date, e.location, e.status as event_status,
            t.id as ticket_id, t.ticket_code,
            COALESCE(json_agg(json_build_object('name', rm.name, 'email', rm.email)) FILTER (WHERE rm.id IS NOT NULL), '[]') as members
     FROM registrations r
     JOIN events e ON r.event_id = e.id
     LEFT JOIN tickets t ON r.id = t.registration_id
     LEFT JOIN registration_members rm ON r.id = rm.registration_id
     WHERE r.user_id = $1
     GROUP BY r.id, e.title, e.start_date, e.location, e.status, t.id, t.ticket_code
     ORDER BY r.created_at DESC`,
    [userId]
  );
  return res.rows;
};

const listEventRegistrations = async (eventId, userId) => {
  const eventRes = await db.query('SELECT organizer_id FROM events WHERE id = $1', [eventId]);
  if (eventRes.rows.length === 0) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }
  const event = eventRes.rows[0];

  const userRoleRes = await db.query('SELECT roles FROM users WHERE id = $1', [userId]);
  const roles = userRoleRes.rows[0]?.roles || [];
  const isOrganizer = event.organizer_id === userId;
  const isAdmin = roles.includes('admin');

  if (!isOrganizer && !isAdmin) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }

  const res = await db.query(
    `SELECT r.*, u.name as user_name, u.email as user_email,
            COALESCE(json_agg(json_build_object('name', rm.name, 'email', rm.email)) FILTER (WHERE rm.id IS NOT NULL), '[]') as members
     FROM registrations r
     JOIN users u ON r.user_id = u.id
     LEFT JOIN registration_members rm ON r.id = rm.registration_id
     WHERE r.event_id = $1
     GROUP BY r.id, u.name, u.email
     ORDER BY r.created_at ASC`,
    [eventId]
  );
  return res.rows;
};

module.exports = {
  register,
  cancelRegistration,
  listMyRegistrations,
  listEventRegistrations
};
