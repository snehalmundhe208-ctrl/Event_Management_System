const db = require('../../config/db');

const listCategories = async () => {
  const res = await db.query('SELECT id, name FROM categories ORDER BY name ASC');
  return res.rows;
};

const listTags = async () => {
  const res = await db.query('SELECT id, name FROM tags ORDER BY name ASC');
  return res.rows;
};

const listEvents = async (filters) => {
  let queryText = `
    SELECT e.*, c.name as category_name,
           COALESCE(json_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '[]') as tags
    FROM events e
    LEFT JOIN categories c ON e.category_id = c.id
    LEFT JOIN event_tags et ON e.id = et.event_id
    LEFT JOIN tags t ON et.tag_id = t.id
  `;
  const whereClauses = [];
  const params = [];

  if (filters.status && filters.status !== 'all') {
    params.push(filters.status);
    whereClauses.push(`e.status = $${params.length}`);
  } else if (!filters.status) {
    params.push('published');
    whereClauses.push(`e.status = $${params.length}`);
  }
  // if status === 'all', no status filter is added (returns all statuses)

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

  queryText += ' GROUP BY e.id, c.name ORDER BY e.start_date ASC';

  const res = await db.query(queryText, params);
  return res.rows;
};

const getEvent = async (id) => {
  const res = await db.query(
    `SELECT e.*, c.name as category_name,
            COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name)) FILTER (WHERE t.id IS NOT NULL), '[]') as tags
     FROM events e
     LEFT JOIN categories c ON e.category_id = c.id
     LEFT JOIN event_tags et ON e.id = et.event_id
     LEFT JOIN tags t ON et.tag_id = t.id
     WHERE e.id = $1
     GROUP BY e.id, c.name`,
    [id]
  );
  if (res.rows.length === 0) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }
  return res.rows[0];
};

const createEvent = async (data, organizerId) => {
  const { title, description, categoryId, startDate, endDate, type, location, capacity, tags } = data;

  const eventRes = await db.query(
    `INSERT INTO events (title, description, category_id, start_date, end_date, type, location, capacity, organizer_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft')
     RETURNING *`,
    [title, description, categoryId, startDate, endDate, type, location, capacity, organizerId]
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

  return getEvent(event.id);
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

  const { title, description, categoryId, startDate, endDate, type, location, capacity, tags } = data;

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
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $9`,
    [title, description, categoryId, startDate, endDate, type, location, capacity, id]
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

  return getEvent(id);
};

const publishEvent = async (id, user) => {
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

  await db.query("UPDATE events SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
  return getEvent(id);
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
      'INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)',
      [row.user_id, message, 'event_cancelled']
    );
  }

  return getEvent(id);
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
    'UPDATE events SET banner_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [filePath, id]
  );
  return getEvent(id);
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
  cancelEvent,
  completeEvent,
  getCertificate,
  uploadBanner
};
