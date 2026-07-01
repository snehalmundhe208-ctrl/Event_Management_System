const db = require('../../config/db');

const listUsers = async (search) => {
  const queryParam = search ? `%${search}%` : '%';
  const res = await db.query(
    `SELECT id, email, name, roles, is_suspended, created_at
     FROM users
     WHERE name ILIKE $1 OR email ILIKE $1
     ORDER BY name ASC`,
    [queryParam]
  );
  return res.rows;
};

const toggleUserSuspension = async (userId, isSuspended) => {
  const res = await db.query(
    'UPDATE users SET is_suspended = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, name, is_suspended',
    [isSuspended, userId]
  );
  if (res.rows.length === 0) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return res.rows[0];
};

const listAllEvents = async (search) => {
  const queryParam = search ? `%${search}%` : '%';
  const res = await db.query(
    `SELECT e.*, u.name as organizer_name, c.name as category_name
     FROM events e
     JOIN users u ON e.organizer_id = u.id
     LEFT JOIN categories c ON e.category_id = c.id
     WHERE e.title ILIKE $1 OR e.description ILIKE $1
     ORDER BY e.created_at DESC`,
    [queryParam]
  );
  return res.rows;
};

const forceCancelEvent = async (eventId) => {
  const eventRes = await db.query('SELECT title, status FROM events WHERE id = $1', [eventId]);
  if (eventRes.rows.length === 0) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  const event = eventRes.rows[0];
  await db.query("UPDATE events SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [eventId]);

  const registrantsRes = await db.query(
    "SELECT user_id FROM registrations WHERE event_id = $1 AND status IN ('confirmed', 'waitlisted')",
    [eventId]
  );

  const message = `Event "${event.title}" has been force-cancelled by platform administrator.`;
  for (const row of registrantsRes.rows) {
    await db.query(
      'INSERT INTO notifications (user_id, message, type, event_id) VALUES ($1, $2, $3, $4)',
      [row.user_id, message, 'event_cancelled', eventId]
    );
  }

  return { id: eventId, title: event.title, status: 'cancelled' };
};

const listPendingApprovals = async () => {
  const res = await db.query(
    `SELECT e.*, u.name as organizer_name, c.name as category_name
     FROM events e
     JOIN users u ON e.organizer_id = u.id
     LEFT JOIN categories c ON e.category_id = c.id
     WHERE e.status = 'draft'
     ORDER BY e.created_at DESC`
  );
  return res.rows;
};

const approveEvent = async (eventId, adminId) => {
  const res = await db.query(
    `UPDATE events
     SET status = 'published',
         approved_at = CURRENT_TIMESTAMP,
         approved_by = $2,
         rejection_reason = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, title, status`,
    [eventId, adminId]
  );

  if (res.rows.length === 0) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  return res.rows[0];
};

const rejectEvent = async (eventId, reason) => {
  const res = await db.query(
    `UPDATE events
     SET status = 'rejected',
         rejection_reason = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, title, status, rejection_reason`,
    [eventId, reason || 'Rejected by admin']
  );

  if (res.rows.length === 0) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  return res.rows[0];
};

const getPlatformAnalytics = async () => {
  const res = await db.query(`
    SELECT
      (SELECT COUNT(*)::int FROM users) as total_users,
      (SELECT COUNT(*)::int FROM events) as total_events,
      (SELECT COUNT(*)::int FROM registrations) as total_registrations
  `);
  return res.rows[0];
};

module.exports = {
  listUsers,
  toggleUserSuspension,
  listAllEvents,
  listPendingApprovals,
  approveEvent,
  rejectEvent,
  forceCancelEvent,
  getPlatformAnalytics
};
