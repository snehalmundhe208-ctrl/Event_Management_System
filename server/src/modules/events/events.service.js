const db = require('../../config/db');

const PUBLIC_EVENT_STATUSES = ['published', 'completed'];

const listCategories = async () => {
  const res = await db.query('SELECT id, name FROM categories ORDER BY name ASC');
  return res.rows;
};

const listTags = async () => {
  const res = await db.query('SELECT id, name FROM tags ORDER BY name ASC');
  return res.rows;
};

const listEvents = async (filters, user) => {
  let queryText = `
    SELECT e.*, c.name as category_name, u.name as organizer_name,
           COALESCE(fr.follower_count, 0) AS organizer_follower_count,
           COALESCE(fs.is_following, FALSE) AS is_following_organizer,
           COALESCE(rt.average_rating, 0) AS average_rating,
           COALESCE(rt.total_ratings, 0) AS total_ratings,
           COALESCE(cm.comment_count, 0) AS comment_count,
           COALESCE(json_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '[]') as tags
    FROM events e
    JOIN users u ON u.id = e.organizer_id
    LEFT JOIN categories c ON e.category_id = c.id
    LEFT JOIN event_tags et ON e.id = et.event_id
    LEFT JOIN tags t ON et.tag_id = t.id
    LEFT JOIN (
      SELECT event_id, ROUND(AVG(rating)::numeric, 1) AS average_rating, COUNT(*)::int AS total_ratings
      FROM feedback
      GROUP BY event_id
    ) rt ON rt.event_id = e.id
    LEFT JOIN (
      SELECT event_id, COUNT(*)::int AS comment_count
      FROM event_comments
      GROUP BY event_id
    ) cm ON cm.event_id = e.id
    LEFT JOIN (
      SELECT following_id, COUNT(*)::int AS follower_count
      FROM user_follows
      GROUP BY following_id
    ) fr ON fr.following_id = e.organizer_id
    LEFT JOIN LATERAL (
      SELECT EXISTS(
        SELECT 1
        FROM user_follows uf
        WHERE uf.following_id = e.organizer_id AND uf.follower_id = $1
      ) AS is_following
    ) fs ON TRUE
  `;
  const whereClauses = [];
  const params = [user?.id || null];
  const isAdmin = user?.roles?.includes('admin');
  const isOwnerScope = user?.id && filters.organizerId === user.id;

  if (filters.status && filters.status !== 'all') {
    if (['draft', 'rejected'].includes(filters.status) && !isAdmin && !isOwnerScope) {
      whereClauses.push('1 = 0');
    } else {
      params.push(filters.status);
      whereClauses.push(`e.status = $${params.length}`);
    }
  } else if (!filters.status) {
    params.push(PUBLIC_EVENT_STATUSES);
    whereClauses.push(`e.status = ANY($${params.length})`);
  } else if (filters.status === 'all' && !isAdmin && !isOwnerScope) {
    params.push(PUBLIC_EVENT_STATUSES);
    whereClauses.push(`e.status = ANY($${params.length})`);
  }

  if (filters.keyword) {
    params.push(`%${filters.keyword}%`);
    whereClauses.push(`(e.title ILIKE $${params.length} OR e.description ILIKE $${params.length})`);
  }

  if (filters.categoryId) {
    params.push(filters.categoryId);
    whereClauses.push(`e.category_id = $${params.length}`);
  }

  if (filters.tagId) {
    params.push(filters.tagId);
    whereClauses.push(`e.id IN (SELECT event_id FROM event_tags WHERE tag_id = $${params.length})`);
  }

  if (filters.type) {
    params.push(filters.type);
    whereClauses.push(`e.type = $${params.length}`);
  }

  if (filters.startDate) {
    params.push(filters.startDate);
    whereClauses.push(`e.start_date >= $${params.length}`);
  }

  if (filters.endDate) {
    params.push(filters.endDate);
    whereClauses.push(`e.end_date <= $${params.length}`);
  }

  if (filters.organizerId) {
    params.push(filters.organizerId);
    whereClauses.push(`e.organizer_id = $${params.length}`);
  }

  if (whereClauses.length > 0) {
    queryText += ' WHERE ' + whereClauses.join(' AND ');
  }

  queryText += ' GROUP BY e.id, c.name, u.name, fr.follower_count, fs.is_following, rt.average_rating, rt.total_ratings, cm.comment_count ORDER BY e.start_date ASC';
  const res = await db.query(queryText, params);
  return res.rows;
};

const getEvent = async (id, user) => {
  const res = await db.query(
    `SELECT e.*, c.name as category_name, u.name as organizer_name, u.roles as organizer_roles,
            COALESCE(fr.follower_count, 0) AS organizer_follower_count,
            COALESCE(fs.is_following, FALSE) AS is_following_organizer,
            COALESCE(rt.average_rating, 0) AS average_rating,
            COALESCE(rt.total_ratings, 0) AS total_ratings,
            COALESCE(cm.comment_count, 0) AS comment_count,
            COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name)) FILTER (WHERE t.id IS NOT NULL), '[]') as tags
     FROM events e
     JOIN users u ON u.id = e.organizer_id
     LEFT JOIN categories c ON e.category_id = c.id
     LEFT JOIN event_tags et ON e.id = et.event_id
     LEFT JOIN tags t ON et.tag_id = t.id
     LEFT JOIN (
       SELECT event_id, ROUND(AVG(rating)::numeric, 1) AS average_rating, COUNT(*)::int AS total_ratings
       FROM feedback
       GROUP BY event_id
     ) rt ON rt.event_id = e.id
     LEFT JOIN (
       SELECT event_id, COUNT(*)::int AS comment_count
       FROM event_comments
       GROUP BY event_id
     ) cm ON cm.event_id = e.id
     LEFT JOIN (
       SELECT following_id, COUNT(*)::int AS follower_count
       FROM user_follows
       GROUP BY following_id
     ) fr ON fr.following_id = e.organizer_id
     LEFT JOIN LATERAL (
       SELECT EXISTS(
         SELECT 1
         FROM user_follows uf
         WHERE uf.following_id = e.organizer_id AND uf.follower_id = $2
       ) AS is_following
     ) fs ON TRUE
     WHERE e.id = $1
     GROUP BY e.id, c.name, u.name, u.roles, fr.follower_count, fs.is_following, rt.average_rating, rt.total_ratings, cm.comment_count`,
    [id, user?.id || null]
  );
  if (res.rows.length === 0) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }
  const event = res.rows[0];
  const isAdmin = user?.roles?.includes('admin');
  const isOrganizer = user?.id === event.organizer_id;

  if (['draft', 'rejected'].includes(event.status) && !isAdmin && !isOrganizer) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  return event;
};

const createEvent = async (data, organizerId) => {
  const { title, description, categoryId, startDate, endDate, type, location, capacity, tags, bannerUrl, galleryUrls } = data;

  const eventRes = await db.query(
    `INSERT INTO events (title, description, category_id, start_date, end_date, type, location, capacity, organizer_id, status, banner_url, thumbnail_url, gallery_urls)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', $10, $11, $12::jsonb)
     RETURNING *`,
    [
      title,
      description,
      categoryId,
      startDate,
      endDate,
      type,
      location,
      capacity,
      organizerId,
      bannerUrl || null,
      bannerUrl || null,
      JSON.stringify(galleryUrls || [])
    ]
  );
  const event = eventRes.rows[0];

  if (tags && tags.length > 0) {
    for (const tagId of tags) {
      await db.query(
        'INSERT INTO event_tags (event_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [event.id, tagId]
      );
    }
  }

  return getEvent(event.id, { id: organizerId, roles: [] });
};

const updateEvent = async (id, data, user) => {
  const eventRes = await db.query('SELECT organizer_id, status FROM events WHERE id = $1', [id]);
  if (eventRes.rows.length === 0) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  const event = eventRes.rows[0];
  const isOrganizer = event.organizer_id === user.id;
  const isAdmin = user.roles.includes('admin');
  if (!isOrganizer && !isAdmin) {
    const error = new Error('Forbidden: Only the organizer or admin can update this event');
    error.statusCode = 403;
    throw error;
  }

  const { title, description, categoryId, startDate, endDate, type, location, capacity, tags, bannerUrl, galleryUrls } = data;

  await db.query(
    `UPDATE events
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         category_id = COALESCE($3, category_id),
         start_date = COALESCE($4, start_date),
         end_date = COALESCE($5, end_date),
         type = COALESCE($6, type),
         location = COALESCE($7, location),
         capacity = COALESCE($8, capacity),
         banner_url = COALESCE($9, banner_url),
         thumbnail_url = COALESCE($10, thumbnail_url),
         gallery_urls = COALESCE($11::jsonb, gallery_urls),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $12`,
    [
      title,
      description,
      categoryId,
      startDate,
      endDate,
      type,
      location,
      capacity,
      bannerUrl || null,
      bannerUrl || null,
      galleryUrls ? JSON.stringify(galleryUrls) : null,
      id
    ]
  );

  if (tags) {
    await db.query('DELETE FROM event_tags WHERE event_id = $1', [id]);
    for (const tagId of tags) {
      await db.query(
        'INSERT INTO event_tags (event_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, tagId]
      );
    }
  }

  return getEvent(id, user);
};

const publishEvent = async (id, user) => {
  const eventRes = await db.query('SELECT title, organizer_id, status FROM events WHERE id = $1', [id]);
  if (eventRes.rows.length === 0) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  const event = eventRes.rows[0];
  const isAdmin = user.roles.includes('admin');
  if (!isAdmin) {
    const error = new Error('Only admins can approve and publish events');
    error.statusCode = 403;
    throw error;
  }

  await db.query(
    "UPDATE events SET status = 'published', approved_at = CURRENT_TIMESTAMP, approved_by = $2, rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
    [id, user.id]
  );
  return getEvent(id, user);
};

const rejectEvent = async (id, reason, user) => {
  const eventRes = await db.query('SELECT title FROM events WHERE id = $1', [id]);
  if (eventRes.rows.length === 0) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  if (!user.roles.includes('admin')) {
    const error = new Error('Only admins can reject events');
    error.statusCode = 403;
    throw error;
  }

  await db.query(
    "UPDATE events SET status = 'rejected', rejection_reason = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
    [id, reason || 'Rejected by admin']
  );

  return getEvent(id, user);
};

const cancelEvent = async (id, user) => {
  const eventRes = await db.query('SELECT title, organizer_id, status FROM events WHERE id = $1', [id]);
  if (eventRes.rows.length === 0) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  const event = eventRes.rows[0];
  const isOrganizer = event.organizer_id === user.id;
  const isAdmin = user.roles.includes('admin');
  if (!isOrganizer && !isAdmin) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }

  await db.query("UPDATE events SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);

  const registrantsRes = await db.query(
    "SELECT user_id FROM registrations WHERE event_id = $1 AND status IN ('confirmed', 'waitlisted')",
    [id]
  );

  const message = `Event "${event.title}" has been cancelled.`;
  for (const row of registrantsRes.rows) {
    await db.query(
      'INSERT INTO notifications (user_id, message, type, event_id) VALUES ($1, $2, $3, $4)',
      [row.user_id, message, 'event_cancelled', id]
    );
  }

  return getEvent(id, user);
};

const uploadBanner = async (id, filePath, user) => {
  const eventRes = await db.query('SELECT organizer_id FROM events WHERE id = $1', [id]);
  if (eventRes.rows.length === 0) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  const event = eventRes.rows[0];
  const isOrganizer = event.organizer_id === user.id;
  const isAdmin = user.roles.includes('admin');
  if (!isOrganizer && !isAdmin) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }

  await db.query(
    'UPDATE events SET banner_url = $1, thumbnail_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [filePath, id]
  );
  return getEvent(id);
};

const uploadGallery = async (id, photoUrls, user) => {
  const eventRes = await db.query('SELECT organizer_id, gallery_urls FROM events WHERE id = $1', [id]);
  if (eventRes.rows.length === 0) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  const event = eventRes.rows[0];
  const isOrganizer = event.organizer_id === user.id;
  const isAdmin = user.roles.includes('admin');
  if (!isOrganizer && !isAdmin) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }

  const currentGallery = Array.isArray(event.gallery_urls) ? event.gallery_urls : [];
  const mergedGallery = [...currentGallery, ...photoUrls];

  await db.query(
    'UPDATE events SET gallery_urls = $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [JSON.stringify(mergedGallery), id]
  );

  return getEvent(id, user);
};

const completeEvent = async (id, user) => {
  const eventRes = await db.query('SELECT title, organizer_id, status FROM events WHERE id = $1', [id]);
  if (eventRes.rows.length === 0) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  const event = eventRes.rows[0];
  const isOrganizer = event.organizer_id === user.id;
  const isAdmin = user.roles.includes('admin');
  if (!isOrganizer && !isAdmin) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }

  await db.query("UPDATE events SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);

  const attendeesRes = await db.query(
    `SELECT DISTINCT r.user_id
     FROM check_ins ci
     JOIN tickets t ON ci.ticket_id = t.id
     JOIN registrations r ON t.registration_id = r.id
     WHERE r.event_id = $1 AND r.status = 'confirmed'`,
    [id]
  );

  const certUrl = `/api/v1/events/${id}/certificate/download`;
  for (const row of attendeesRes.rows) {
    await db.query(
      'INSERT INTO certificates (event_id, user_id, certificate_url) VALUES ($1, $2, $3) ON CONFLICT (user_id, event_id) DO NOTHING',
      [id, row.user_id, certUrl]
    );
  }

  return getEvent(id);
};

const getCertificate = async (eventId, userId) => {
  const certRes = await db.query(
    `SELECT c.*, u.name as attendee_name, e.title as event_title, e.end_date
     FROM certificates c
     JOIN users u ON c.user_id = u.id
     JOIN events e ON c.event_id = e.id
     WHERE c.event_id = $1 AND c.user_id = $2`,
    [eventId, userId]
  );
  if (certRes.rows.length === 0) {
    const error = new Error('Certificate of participation not found. You must be checked in and the event must be completed.');
    error.statusCode = 404;
    throw error;
  }
  return certRes.rows[0];
};

module.exports = {
  listCategories,
  listTags,
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  publishEvent,
  rejectEvent,
  cancelEvent,
  completeEvent,
  getCertificate,
  uploadBanner,
  uploadGallery
};
