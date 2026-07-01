const db = require('../../config/db');

const getProfileStats = async (targetUserId, currentUserId) => {
  const userRes = await db.query('SELECT id, name, roles FROM users WHERE id = $1', [targetUserId]);
  if (userRes.rows.length === 0) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const countsRes = await db.query(
    `SELECT
       (SELECT COUNT(*)::int FROM user_follows WHERE following_id = $1) AS follower_count,
       (SELECT COUNT(*)::int FROM user_follows WHERE follower_id = $1) AS following_count,
       EXISTS(
         SELECT 1
         FROM user_follows
         WHERE follower_id = $2 AND following_id = $1
       ) AS is_following`,
    [targetUserId, currentUserId || null]
  );

  return {
    ...userRes.rows[0],
    follower_count: countsRes.rows[0].follower_count,
    following_count: countsRes.rows[0].following_count,
    is_following: countsRes.rows[0].is_following
  };
};

const toggleFollow = async (targetUserId, currentUserId) => {
  if (targetUserId === currentUserId) {
    const error = new Error('You cannot follow yourself');
    error.statusCode = 400;
    throw error;
  }

  const existing = await db.query(
    'SELECT 1 FROM user_follows WHERE follower_id = $1 AND following_id = $2',
    [currentUserId, targetUserId]
  );

  if (existing.rows.length > 0) {
    await db.query(
      'DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2',
      [currentUserId, targetUserId]
    );
  } else {
    await db.query(
      'INSERT INTO user_follows (follower_id, following_id) VALUES ($1, $2)',
      [currentUserId, targetUserId]
    );
  }

  return getProfileStats(targetUserId, currentUserId);
};

module.exports = {
  getProfileStats,
  toggleFollow
};
