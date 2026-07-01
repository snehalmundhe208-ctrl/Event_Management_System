const db = require('../../config/db');

const submitFeedback = async (userId, { eventId, rating, comment, photoUrl }) => {
  const eventRes = await db.query('SELECT status FROM events WHERE id = $1', [eventId]);
  if (eventRes.rows.length === 0) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  if (eventRes.rows[0].status !== 'completed') {
    const error = new Error('Feedback is only available for completed events');
    error.statusCode = 400;
    throw error;
  }

  const checkinRes = await db.query(
    `SELECT ci.id
     FROM check_ins ci
     JOIN tickets t ON ci.ticket_id = t.id
     JOIN registrations r ON t.registration_id = r.id
     WHERE r.event_id = $1 AND r.user_id = $2`,
    [eventId, userId]
  );

  if (checkinRes.rows.length === 0) {
    const error = new Error('Feedback is only allowed for checked-in attendees');
    error.statusCode = 403;
    throw error;
  }

  const existingRes = await db.query(
    'SELECT id FROM feedback WHERE event_id = $1 AND user_id = $2',
    [eventId, userId]
  );
  if (existingRes.rows.length > 0) {
    const error = new Error('Feedback already submitted for this event');
    error.statusCode = 400;
    throw error;
  }

  const res = await db.query(
    'INSERT INTO feedback (event_id, user_id, rating, comment, photo_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [eventId, userId, rating, comment || null, photoUrl || null]
  );
  return res.rows[0];
};

const listFeedback = async (eventId) => {
  const res = await db.query(
    `SELECT f.*, u.name as user_name
     FROM feedback f
     JOIN users u ON f.user_id = u.id
     WHERE f.event_id = $1
     ORDER BY f.created_at DESC`,
    [eventId]
  );
  return res.rows;
};

const getRatingSummary = async (eventId) => {
  const res = await db.query(
    'SELECT COALESCE(AVG(rating), 0) as average_rating, COUNT(id) as total_count FROM feedback WHERE event_id = $1',
    [eventId]
  );
  const row = res.rows[0];
  return {
    averageRating: parseFloat(parseFloat(row.average_rating).toFixed(1)),
    totalCount: parseInt(row.total_count, 10)
  };
};

module.exports = {
  submitFeedback,
  listFeedback,
  getRatingSummary
};
