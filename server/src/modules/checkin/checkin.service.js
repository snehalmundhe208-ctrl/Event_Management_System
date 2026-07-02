const crypto = require('crypto');
const db = require('../../config/db');

const verifyHmac = (ticketCode, signature) => {
  const expected = crypto
    .createHmac('sha256', process.env.TICKET_HMAC_SECRET || 'secret')
    .update(ticketCode)
    .digest('hex');
  return expected === signature;
};

const assertEventMatch = (ticketEventId, requestedEventId) => {
  if (requestedEventId && ticketEventId !== requestedEventId) {
    const error = new Error('Ticket does not belong to this event');
    error.statusCode = 400;
    throw error;
  }
};

const scanCheckIn = async ({ ticketCode, signature, eventId }, scannedBy) => {
  if (!verifyHmac(ticketCode, signature)) {
    const error = new Error('Invalid ticket signature');
    error.statusCode = 400;
    throw error;
  }

  const ticketRes = await db.query(
    `SELECT t.id, t.registration_id, r.event_id, r.status, u.name as attendee_name
     FROM tickets t
     JOIN registrations r ON t.registration_id = r.id
     JOIN users u ON r.user_id = u.id
     WHERE t.ticket_code = $1`,
    [ticketCode]
  );
  if (ticketRes.rows.length === 0) {
    const error = new Error('Ticket not found');
    error.statusCode = 404;
    throw error;
  }

  const ticket = ticketRes.rows[0];
  assertEventMatch(ticket.event_id, eventId);
  if (ticket.status !== 'confirmed') {
    const error = new Error('Registration status is not confirmed');
    error.statusCode = 400;
    throw error;
  }

  const eventRes = await db.query('SELECT organizer_id, status FROM events WHERE id = $1', [ticket.event_id]);
  const event = eventRes.rows[0];
  if (event.status !== 'published') {
    const error = new Error('Check-in is only available for published events');
    error.statusCode = 400;
    throw error;
  }
  if (event.organizer_id !== scannedBy) {
    const userRoleRes = await db.query('SELECT roles FROM users WHERE id = $1', [scannedBy]);
    const roles = userRoleRes.rows[0]?.roles || [];
    if (!roles.includes('admin')) {
      const error = new Error('Forbidden: Only the event organizer or admin can check in attendees');
      error.statusCode = 403;
      throw error;
    }
  }

  const checkinRes = await db.query('SELECT id FROM check_ins WHERE ticket_id = $1', [ticket.id]);
  if (checkinRes.rows.length > 0) {
    const error = new Error('Ticket already checked in');
    error.statusCode = 400;
    throw error;
  }

  const insertRes = await db.query(
    'INSERT INTO check_ins (ticket_id, scanned_by) VALUES ($1, $2) RETURNING *',
    [ticket.id, scannedBy]
  );
  return {
    checkIn: insertRes.rows[0],
    attendeeName: ticket.attendee_name,
    ticketCode
  };
};

const manualCheckIn = async ({ ticketCode, eventId }, scannedBy) => {
  const ticketRes = await db.query(
    `SELECT t.id, t.registration_id, r.event_id, r.status, u.name as attendee_name
     FROM tickets t
     JOIN registrations r ON t.registration_id = r.id
     JOIN users u ON r.user_id = u.id
     WHERE t.ticket_code = $1`,
    [ticketCode]
  );
  if (ticketRes.rows.length === 0) {
    const error = new Error('Ticket not found');
    error.statusCode = 404;
    throw error;
  }

  const ticket = ticketRes.rows[0];
  assertEventMatch(ticket.event_id, eventId);
  if (ticket.status !== 'confirmed') {
    const error = new Error('Registration status is not confirmed');
    error.statusCode = 400;
    throw error;
  }

  const eventRes = await db.query('SELECT organizer_id, status FROM events WHERE id = $1', [ticket.event_id]);
  const event = eventRes.rows[0];
  if (event.status !== 'published') {
    const error = new Error('Check-in is only available for published events');
    error.statusCode = 400;
    throw error;
  }
  if (event.organizer_id !== scannedBy) {
    const userRoleRes = await db.query('SELECT roles FROM users WHERE id = $1', [scannedBy]);
    const roles = userRoleRes.rows[0]?.roles || [];
    if (!roles.includes('admin')) {
      const error = new Error('Forbidden: Only the event organizer or admin can check in attendees');
      error.statusCode = 403;
      throw error;
    }
  }

  const checkinRes = await db.query('SELECT id FROM check_ins WHERE ticket_id = $1', [ticket.id]);
  if (checkinRes.rows.length > 0) {
    const error = new Error('Ticket already checked in');
    error.statusCode = 400;
    throw error;
  }

  const insertRes = await db.query(
    'INSERT INTO check_ins (ticket_id, scanned_by) VALUES ($1, $2) RETURNING *',
    [ticket.id, scannedBy]
  );
  return {
    checkIn: insertRes.rows[0],
    attendeeName: ticket.attendee_name,
    ticketCode
  };
};

const listCheckIns = async (eventId, userId) => {
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
    `SELECT ci.*, t.ticket_code, u.name as attendee_name, u.email as attendee_email, su.name as scanner_name
     FROM check_ins ci
     JOIN tickets t ON ci.ticket_id = t.id
     JOIN registrations r ON t.registration_id = r.id
     JOIN users u ON r.user_id = u.id
     LEFT JOIN users su ON ci.scanned_by = su.id
     WHERE r.event_id = $1
     ORDER BY ci.scanned_at DESC`,
    [eventId]
  );
  return res.rows;
};

const getMyCheckInStatus = async (eventId, userId) => {
  const res = await db.query(
    `SELECT EXISTS(
       SELECT 1
       FROM check_ins ci
       JOIN tickets t ON t.id = ci.ticket_id
       JOIN registrations r ON r.id = t.registration_id
       WHERE r.event_id = $1 AND r.user_id = $2
     ) AS is_checked_in`,
    [eventId, userId]
  );

  return {
    eventId,
    isCheckedIn: Boolean(res.rows[0]?.is_checked_in)
  };
};

module.exports = {
  scanCheckIn,
  manualCheckIn,
  listCheckIns,
  getMyCheckInStatus
};
