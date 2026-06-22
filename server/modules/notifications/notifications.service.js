const db = require('../../config/db');

const listMyNotifications = async (userId) => {
  const res = await db.query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
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
