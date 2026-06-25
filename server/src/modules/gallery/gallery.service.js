const db = require('../../config/db');

const uploadPhoto = async (userId, eventId, photoUrl) => {
  const checkinRes = await db.query(
    `SELECT ci.id
     FROM check_ins ci
     JOIN tickets t ON ci.ticket_id = t.id
     JOIN registrations r ON t.registration_id = r.id
     WHERE r.event_id = $1 AND r.user_id = $2`,
    [eventId, userId]
  );

  if (checkinRes.rows.length === 0) {
    const error = new Error('Photo upload is only allowed for checked-in attendees');
    error.statusCode = 403;
    throw error;
  }

  const res = await db.query(
    'INSERT INTO gallery_items (event_id, user_id, photo_url) VALUES ($1, $2, $3) RETURNING *',
    [eventId, userId, photoUrl]
  );
  return res.rows[0];
};

const listGalleryItems = async (eventId, currentUserId) => {
  const res = await db.query(
    `SELECT gi.*, u.name as user_name,
            COUNT(gl.id)::int as likes_count,
            EXISTS(SELECT 1 FROM gallery_likes WHERE gallery_item_id = gi.id AND user_id = $2) as is_liked
     FROM gallery_items gi
     JOIN users u ON gi.user_id = u.id
     LEFT JOIN gallery_likes gl ON gi.id = gl.gallery_item_id
     WHERE gi.event_id = $1
     GROUP BY gi.id, u.name
     ORDER BY gi.created_at DESC`,
    [eventId, currentUserId || null]
  );
  return res.rows;
};

const likeGalleryItem = async (itemId, userId) => {
  const itemRes = await db.query('SELECT id FROM gallery_items WHERE id = $1', [itemId]);
  if (itemRes.rows.length === 0) {
    const error = new Error('Gallery item not found');
    error.statusCode = 404;
    throw error;
  }

  const existingRes = await db.query(
    'SELECT id FROM gallery_likes WHERE gallery_item_id = $1 AND user_id = $2',
    [itemId, userId]
  );

  if (existingRes.rows.length > 0) {
    await db.query('DELETE FROM gallery_likes WHERE id = $1', [existingRes.rows[0].id]);
    return { liked: false };
  } else {
    await db.query(
      'INSERT INTO gallery_likes (gallery_item_id, user_id) VALUES ($1, $2)',
      [itemId, userId]
    );
    return { liked: true };
  }
};

module.exports = {
  uploadPhoto,
  listGalleryItems,
  likeGalleryItem
};