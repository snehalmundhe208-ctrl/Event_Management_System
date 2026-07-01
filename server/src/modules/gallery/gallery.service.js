const db = require('../../config/db');

const uploadPhoto = async (user, eventId, photoUrl) => {
  const eventRes = await db.query(
    `SELECT e.id, e.organizer_id, e.status, e.start_date, e.end_date,
            u.name AS organizer_name
     FROM events e
     JOIN users u ON u.id = e.organizer_id
     WHERE e.id = $1`,
    [eventId]
  );
  if (eventRes.rows.length === 0) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  const event = eventRes.rows[0];
  const isAdmin = user.roles.includes('admin');
  const isOrganizer = user.roles.includes('organizer');
  const isOwner = event.organizer_id === user.id;

  if (['cancelled', 'rejected'].includes(event.status)) {
    const error = new Error('Gallery uploads are disabled for this event');
    error.statusCode = 400;
    throw error;
  }

  if (event.status === 'draft' && !isAdmin && !isOwner) {
    const error = new Error('Only the organizer or admin can upload before this event is published');
    error.statusCode = 403;
    throw error;
  }

  const now = Date.now();
  const startAt = event.start_date ? new Date(event.start_date).getTime() : null;
  const endAt = event.end_date ? new Date(event.end_date).getTime() : null;

  let uploadPhase = 'live';
  if (startAt && now < startAt) {
    uploadPhase = 'pre';
  } else if (endAt && now > endAt) {
    uploadPhase = 'post';
  } else if (event.status === 'completed') {
    uploadPhase = 'post';
  }

  if (!isAdmin && !isOrganizer && !user.roles.includes('attendee')) {
    const error = new Error('You do not have permission to upload gallery photos');
    error.statusCode = 403;
    throw error;
  }

  const res = await db.query(
    `INSERT INTO gallery_items (event_id, user_id, photo_url, upload_phase)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [eventId, user.id, photoUrl, uploadPhase]
  );
  return res.rows[0];
};

const listGalleryItems = async (eventId, currentUserId) => {
  const [eventRes, itemsRes] = await Promise.all([
    db.query(
      `SELECT e.gallery_urls, u.name AS organizer_name
       FROM events e
       JOIN users u ON u.id = e.organizer_id
       WHERE e.id = $1`,
      [eventId]
    ),
    db.query(
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
    )
  ]);

  const event = eventRes.rows[0];
  if (!event) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  const staticItems = (Array.isArray(event.gallery_urls) ? event.gallery_urls : []).map((photoUrl, index) => ({
    id: `static-${index}`,
    event_id: eventId,
    user_id: null,
    user_name: event.organizer_name,
    photo_url: photoUrl,
    likes_count: 0,
    is_liked: false,
    created_at: null,
    upload_phase: 'pre',
    can_like: false
  }));

  const dynamicItems = itemsRes.rows.map((item) => ({
    ...item,
    can_like: true
  }));

  return [...dynamicItems, ...staticItems];
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
