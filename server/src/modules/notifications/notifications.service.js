const db = require('../../config/db');

const listMyNotifications = async (userId) => {
  const res = await db.query(
    `SELECT
       n.*,
       e.title AS event_title,
       CASE
         WHEN n.event_id IS NOT NULL THEN '/event/' || n.event_id::text
         ELSE '/dashboard'
       END AS target_path
     FROM notifications n
     LEFT JOIN events e ON e.id = n.event_id
     WHERE n.user_id = $1
     ORDER BY n.created_at DESC`,
    [userId]
  );
  return res.rows;
};

const markAsRead = async (notificationId, userId) => {
  const res = await db.query(
    'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
    [notificationId, userId]
  );
  if (res.rows.length === 0) {
    const error = new Error('Notification not found or access denied');
    error.statusCode = 404;
    throw error;
  }
  return res.rows[0];
};

module.exports = {
  listMyNotifications,
  markAsRead
};
