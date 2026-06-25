const db = require('../../config/db');

const getEventStats = async (eventId, userId) => {
  const eventRes = await db.query('SELECT capacity, organizer_id FROM events WHERE id = $1', [eventId]);
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

  const capacity = event.capacity;

  const regRes = await db.query('SELECT COUNT(*) as count FROM registrations WHERE event_id = $1', [eventId]);
  const regCount = parseInt(regRes.rows[0].count, 10);

  const confirmedRes = await db.query(
    "SELECT COUNT(*) as count FROM registrations WHERE event_id = $1 AND status = 'confirmed'",
    [eventId]
  );
  const confirmedCount = parseInt(confirmedRes.rows[0].count, 10);

  const confirmedMembersRes = await db.query(
    "SELECT COUNT(rm.id) as count FROM registration_members rm JOIN registrations r ON rm.registration_id = r.id WHERE r.event_id = $1 AND r.status = 'confirmed'",
    [eventId]
  );
  const confirmedMembersCount = parseInt(confirmedMembersRes.rows[0].count, 10);

  const totalConfirmed = confirmedCount + confirmedMembersCount;

  const waitlistRes = await db.query(
    "SELECT COUNT(*) as count FROM registrations WHERE event_id = $1 AND status = 'waitlisted'",
    [eventId]
  );
  const waitlistCount = parseInt(waitlistRes.rows[0].count, 10);

  const waitlistMembersRes = await db.query(
    "SELECT COUNT(rm.id) as count FROM registration_members rm JOIN registrations r ON rm.registration_id = r.id WHERE r.event_id = $1 AND r.status = 'waitlisted'",
    [eventId]
  );
  const waitlistMembersCount = parseInt(waitlistMembersRes.rows[0].count, 10);
  const totalWaitlist = waitlistCount + waitlistMembersCount;

  const checkinRes = await db.query(
    'SELECT COUNT(*) as count FROM check_ins ci JOIN tickets t ON ci.ticket_id = t.id JOIN registrations r ON t.registration_id = r.id WHERE r.event_id = $1',
    [eventId]
  );
  const checkinCount = parseInt(checkinRes.rows[0].count, 10);

  const capacityFillPercentage = capacity > 0 ? parseFloat(((totalConfirmed / capacity) * 100).toFixed(2)) : 0;

  return {
    registrationCount: regCount,
    confirmedCount: totalConfirmed,
    waitlistCount: totalWaitlist,
    capacityFillPercentage,
    checkInCount: checkinCount
  };
};

const exportRegistrantsCsv = async (eventId, userId) => {
  const eventRes = await db.query('SELECT title, organizer_id FROM events WHERE id = $1', [eventId]);
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

  const queryRes = await db.query(
    `SELECT r.id::text, u.name, u.email, 'primary' as role_type, r.status, r.created_at
     FROM registrations r
     JOIN users u ON r.user_id = u.id
     WHERE r.event_id = $1
     UNION ALL
     SELECT r.id::text, rm.name, rm.email, 'member' as role_type, r.status, rm.created_at
     FROM registration_members rm
     JOIN registrations r ON rm.registration_id = r.id
     WHERE r.event_id = $1
     ORDER BY created_at ASC`,
    [eventId]
  );

  const csvRows = ['"Registration ID","Name","Email","Role","Status","Registered At"'];
  for (const row of queryRes.rows) {
    const dateStr = row.created_at ? new Date(row.created_at).toISOString() : '';
    csvRows.push(
      `"${row.id}","${row.name.replace(/"/g, '""')}","${row.email.replace(/"/g, '""')}","${row.role_type}","${row.status}","${dateStr}"`
    );
  }

  return {
    filename: `registrants-${eventId}.csv`,
    data: csvRows.join('\n')
  };
};

module.exports = {
  getEventStats,
  exportRegistrantsCsv
};
