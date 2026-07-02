require('dotenv').config();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../src/config/db');
const { bootstrapDatabase } = require('../src/config/bootstrap');

const categoryNames = [
  'Technology',
  'Business',
  'Design',
  'Education',
  'Health',
  'Music',
  'Food',
  'Sports'
];

const tagNames = [
  'networking',
  'conference',
  'workshop',
  'community',
  'leadership',
  'startup',
  'wellness',
  'culture'
];

const imagePool = [
  'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1515169067868-5387ec356754?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1400&q=80'
];

const cities = ['New York', 'San Francisco', 'Austin', 'Chicago', 'Seattle', 'Boston', 'Denver', 'Miami'];
const titlePartsA = ['Summit', 'Expo', 'Lab', 'Meetup', 'Forum', 'Bootcamp', 'Retreat', 'Festival', 'Symposium'];
const titlePartsB = ['Future Builders', 'Creative Pulse', 'Growth Leaders', 'City Innovators', 'Digital Horizons', 'Wellness Week', 'Startup Sprint', 'Design Circle'];
const descriptions = [
  'A curated gathering with talks, networking, live sessions, and hands-on experiences for modern teams.',
  'An immersive event designed to connect professionals, showcase new ideas, and turn conversations into action.',
  'A high-energy program featuring expert speakers, practical workshops, and community-driven collaboration.'
];
const reviewComments = [
  'Amazing experience with practical takeaways and great networking.',
  'Well organized, insightful speakers, and a strong community vibe.',
  'Loved the sessions and the overall energy of the event.'
];
const eventComments = [
  'Really excited to see more events like this on the platform.',
  'The gallery and recap made the event feel alive even afterward.',
  'Great host and smooth attendee experience from start to finish.'
];

const pick = (array, index) => array[index % array.length];
const chunkImages = (index) => {
  const total = 2 + (index % 3);
  return Array.from({ length: total }, (_, offset) => pick(imagePool, index + offset + 1));
};
const ticketCode = () => `TIC-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
const ticketSignature = (value) => crypto.createHmac('sha256', process.env.TICKET_HMAC_SECRET || 'secret').update(value).digest('hex');

const ensureUser = async (email, name, roles) => {
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    await db.query(
      'UPDATE users SET name = COALESCE($2, name), roles = COALESCE($3::varchar[], roles), updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [existing.rows[0].id, name || null, roles || null]
    );
    return existing.rows[0].id;
  }

  const passwordHash = await bcrypt.hash('Password123!', 10);
  const res = await db.query(
    'INSERT INTO users (email, password_hash, name, roles) VALUES ($1, $2, $3, $4) RETURNING id',
    [email, passwordHash, name, roles]
  );
  return res.rows[0].id;
};

const ensureLookupRows = async (table, names) => {
  const ids = {};

  for (const name of names) {
    const existing = await db.query(`SELECT id FROM ${table} WHERE name = $1 LIMIT 1`, [name]);
    if (existing.rows.length > 0) {
      ids[name] = existing.rows[0].id;
      continue;
    }

    const inserted = await db.query(`INSERT INTO ${table} (name) VALUES ($1) RETURNING id`, [name]);
    ids[name] = inserted.rows[0].id;
  }

  return ids;
};

const normalizeUserRoles = async ({ adminId, organizerIds }) => {
  const res = await db.query('SELECT id FROM users ORDER BY created_at ASC, id ASC');
  const userIds = res.rows.map((row) => row.id);
  if (userIds.length === 0) return;

  const desiredAdmin = adminId || userIds[0];
  const desiredOrganizers = (organizerIds || []).filter((id) => id && id !== desiredAdmin).slice(0, 3);
  const organizerSet = new Set(desiredOrganizers);

  for (const userId of userIds) {
    let roles = ['attendee'];
    if (userId === desiredAdmin) roles = ['admin'];
    else if (organizerSet.has(userId)) roles = ['organizer'];
    await db.query('UPDATE users SET roles = $2::varchar[], updated_at = CURRENT_TIMESTAMP WHERE id = $1', [userId, roles]);
  }
};

const normalizeEventStatuses = async () => {
  const res = await db.query('SELECT id FROM events ORDER BY created_at ASC, id ASC');
  const events = res.rows;
  const total = events.length;
  if (!total) return;

  const completedCount = Math.max(1, Math.floor(total / 3));
  const publishedCount = Math.max(1, Math.floor(total / 3));

  const now = Date.now();
  for (let i = 0; i < events.length; i += 1) {
    const eventId = events[i].id;
    let status = 'draft';
    if (i < completedCount) status = 'completed';
    else if (i < completedCount + publishedCount) status = 'published';

    let startDate = new Date(now + (i + 2) * 24 * 60 * 60 * 1000);
    let endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
    if (status === 'completed') {
      endDate = new Date(now - (i + 2) * 24 * 60 * 60 * 1000);
      startDate = new Date(endDate.getTime() - 3 * 60 * 60 * 1000);
    }

    await db.query(
      `UPDATE events
       SET status = $2::varchar,
           start_date = $3,
           end_date = $4,
           approved_at = CASE WHEN $2::varchar = 'published' THEN COALESCE(approved_at, CURRENT_TIMESTAMP) ELSE approved_at END,
           approved_by = CASE WHEN $2::varchar = 'published' THEN COALESCE(approved_by, organizer_id) ELSE approved_by END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [eventId, status, startDate.toISOString(), endDate.toISOString()]
    );
  }
};

const normalizeRegistrationsCreatedAt = async () => {
  await db.query(
    `WITH ordered AS (
       SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
       FROM registrations
     )
     UPDATE registrations r
     SET created_at = (CURRENT_TIMESTAMP
       - ((ordered.rn - 1) % 30) * INTERVAL '1 day'
       - ((ordered.rn - 1) % 24) * INTERVAL '1 hour'),
       updated_at = CURRENT_TIMESTAMP
     FROM ordered
     WHERE r.id = ordered.id`
  );
};

const ensureTicketsForRegistrations = async () => {
  const missing = await db.query(
    `SELECT r.id
     FROM registrations r
     LEFT JOIN tickets t ON t.registration_id = r.id
     WHERE t.id IS NULL
     ORDER BY r.created_at ASC, r.id ASC`
  );

  for (const row of missing.rows) {
    const code = ticketCode();
    await db.query(
      `INSERT INTO tickets (registration_id, ticket_code, hmac_signature)
       VALUES ($1, $2, $3)
       ON CONFLICT (ticket_code) DO NOTHING`,
      [row.id, code, ticketSignature(code)]
    );
  }
};

const ensureRecentRegistrations = async ({ minCount, userIds, eventIds }) => {
  const countRes = await db.query('SELECT COUNT(*)::int AS count FROM registrations');
  const current = countRes.rows[0]?.count || 0;
  if (current >= minCount) return;

  const needed = minCount - current;
  const now = Date.now();
  for (let i = 0; i < needed; i += 1) {
    const userId = pick(userIds, i);
    const eventId = pick(eventIds, i + 3);
    const createdAt = new Date(now - (i % 30) * 24 * 60 * 60 * 1000 - (i % 12) * 60 * 60 * 1000).toISOString();
    await db.query(
      `INSERT INTO registrations (event_id, user_id, status, created_at, updated_at)
       VALUES ($1, $2, 'confirmed', $3, $3)
       ON CONFLICT (user_id, event_id) DO NOTHING`,
      [eventId, userId, createdAt]
    );
  }
};

const ensureCheckInsForCompletedEvents = async ({ fallbackScannerId }) => {
  const res = await db.query(
    `SELECT t.id AS ticket_id, e.organizer_id
     FROM tickets t
     JOIN registrations r ON r.id = t.registration_id
     JOIN events e ON e.id = r.event_id
     LEFT JOIN check_ins ci ON ci.ticket_id = t.id
     WHERE ci.id IS NULL AND e.status = 'completed'
     ORDER BY r.created_at DESC, t.id ASC`
  );

  for (const row of res.rows) {
    await db.query(
      `INSERT INTO check_ins (ticket_id, scanned_by)
       SELECT $1, $2
       WHERE NOT EXISTS (SELECT 1 FROM check_ins WHERE ticket_id = $1)`,
      [row.ticket_id, row.organizer_id || fallbackScannerId || null]
    );
  }
};

const ensureAdminAttended = async ({ adminId }) => {
  const eventRes = await db.query(
    "SELECT id, organizer_id FROM events WHERE status = 'completed' ORDER BY end_date DESC, id ASC LIMIT 1"
  );
  if (eventRes.rows.length === 0) return;

  const eventId = eventRes.rows[0].id;
  const scannerId = eventRes.rows[0].organizer_id || adminId;

  const regRes = await db.query(
    `INSERT INTO registrations (event_id, user_id, status)
     VALUES ($1, $2, 'confirmed')
     ON CONFLICT (user_id, event_id) DO UPDATE SET status = EXCLUDED.status
     RETURNING id`,
    [eventId, adminId]
  );
  const registrationId = regRes.rows[0].id;

  const ticketExisting = await db.query('SELECT id FROM tickets WHERE registration_id = $1 LIMIT 1', [registrationId]);
  let ticketId = ticketExisting.rows[0]?.id || null;
  if (!ticketId) {
    const code = ticketCode();
    const inserted = await db.query(
      `INSERT INTO tickets (registration_id, ticket_code, hmac_signature)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [registrationId, code, ticketSignature(code)]
    );
    ticketId = inserted.rows[0].id;
  }

  await db.query(
    `INSERT INTO check_ins (ticket_id, scanned_by)
     SELECT $1, $2
     WHERE NOT EXISTS (SELECT 1 FROM check_ins WHERE ticket_id = $1)`,
    [ticketId, scannerId]
  );
};

const ensureSeedSocialData = async ({ adminId, organizerIds }) => {
  await db.query("DELETE FROM event_comments WHERE content LIKE 'Seed:%'");

  const eventsRes = await db.query('SELECT id FROM events ORDER BY created_at ASC, id ASC');
  const usersRes = await db.query('SELECT id FROM users ORDER BY created_at ASC, id ASC');
  const eventIds = eventsRes.rows.map((r) => r.id);
  const userIds = usersRes.rows.map((r) => r.id);
  if (eventIds.length === 0 || userIds.length === 0) return;

  const followTargets = (organizerIds || []).filter((id) => id && id !== adminId);
  for (let i = 0; i < Math.min(userIds.length, 12); i += 1) {
    const followerId = userIds[i];
    const followingId = pick(followTargets, i) || adminId;
    if (followerId && followingId && followerId !== followingId) {
      await db.query(
        'INSERT INTO user_follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [followerId, followingId]
      );
    }
  }

  for (let i = 0; i < 20; i += 1) {
    const eventId = pick(eventIds, i);
    const commenterId = pick(userIds, i + 2);
    await db.query(
      `INSERT INTO event_comments (event_id, user_id, content, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP - ($4::int % 20) * INTERVAL '1 day')`,
      [eventId, commenterId, `Seed: Comment ${i + 1}`, i]
    );
  }

  const completedEventRes = await db.query("SELECT id FROM events WHERE status = 'completed' ORDER BY end_date DESC, id ASC LIMIT 1");
  const reviewEventId = completedEventRes.rows[0]?.id || eventIds[0];

  for (let i = 0; i < 12; i += 1) {
    const reviewerId = i === 0 ? adminId : pick(userIds, i + 3);
    const createdAt = new Date(Date.now() - (i % 30) * 24 * 60 * 60 * 1000).toISOString();
    await db.query(
      `INSERT INTO feedback (event_id, user_id, rating, comment, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, event_id)
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = EXCLUDED.created_at`,
      [reviewEventId, reviewerId, 4 + (i % 2), `Seed: Review ${i + 1}`, createdAt]
    );
  }
};

const buildEventPayload = (index, categoryMap, organizerIds) => {
  const now = new Date();
  const isPast = index < 12;
  const isDraft = index >= 28;
  const dayOffset = isPast ? -(index + 5) : index - 10;
  const startDate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
  startDate.setHours(10 + (index % 6), 0, 0, 0);
  const endDate = new Date(startDate.getTime() + (3 + (index % 4)) * 60 * 60 * 1000);

  const categoryName = pick(categoryNames, index);
  const bannerUrl = pick(imagePool, index);
  const galleryUrls = chunkImages(index);
  const status = isPast ? 'completed' : (isDraft ? 'draft' : 'published');

  return {
    title: `${pick(titlePartsA, index)}: ${pick(titlePartsB, index)}`,
    description: pick(descriptions, index),
    categoryId: categoryMap[categoryName],
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    type: pick(['in-person', 'online', 'hybrid'], index),
    location: pick(cities, index),
    capacity: 80 + (index % 7) * 20,
    organizerId: pick(organizerIds, index),
    status,
    bannerUrl,
    thumbnailUrl: bannerUrl,
    galleryUrls,
    approvedBy: status === 'published' ? organizerIds[0] : null
  };
};

const seedEvents = async () => {
  await bootstrapDatabase();

  const adminId = await ensureUser('admin@eventsphere.app', 'Platform Admin', ['admin']);
  const organizerA = await ensureUser('organizer1@eventsphere.app', 'Ava Organizer', ['organizer']);
  const organizerB = await ensureUser('organizer2@eventsphere.app', 'Liam Organizer', ['organizer']);
  const attendeeA = await ensureUser('attendee1@eventsphere.app', 'Mia Attendee', ['attendee']);
  const attendeeB = await ensureUser('attendee2@eventsphere.app', 'Noah Attendee', ['attendee']);
  const attendeeC = await ensureUser('attendee3@eventsphere.app', 'Emma Attendee', ['attendee']);
  const attendeeD = await ensureUser('attendee4@eventsphere.app', 'Leo Attendee', ['attendee']);
  const attendeeE = await ensureUser('attendee5@eventsphere.app', 'Sophia Attendee', ['attendee']);
  const organizerIds = [organizerA, organizerB, adminId];
  const attendeeIds = [attendeeA, attendeeB, attendeeC, attendeeD, attendeeE];

  const categoryMap = await ensureLookupRows('categories', categoryNames);
  const tagMap = await ensureLookupRows('tags', tagNames);

  await db.query("DELETE FROM check_ins WHERE ticket_id IN (SELECT id FROM tickets WHERE registration_id IN (SELECT id FROM registrations WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'Summit:%' OR title LIKE 'Expo:%' OR title LIKE 'Lab:%' OR title LIKE 'Meetup:%' OR title LIKE 'Forum:%' OR title LIKE 'Bootcamp:%' OR title LIKE 'Retreat:%' OR title LIKE 'Festival:%' OR title LIKE 'Symposium:%')))");
  await db.query("DELETE FROM tickets WHERE registration_id IN (SELECT id FROM registrations WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'Summit:%' OR title LIKE 'Expo:%' OR title LIKE 'Lab:%' OR title LIKE 'Meetup:%' OR title LIKE 'Forum:%' OR title LIKE 'Bootcamp:%' OR title LIKE 'Retreat:%' OR title LIKE 'Festival:%' OR title LIKE 'Symposium:%'))");
  await db.query("DELETE FROM registration_members WHERE registration_id IN (SELECT id FROM registrations WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'Summit:%' OR title LIKE 'Expo:%' OR title LIKE 'Lab:%' OR title LIKE 'Meetup:%' OR title LIKE 'Forum:%' OR title LIKE 'Bootcamp:%' OR title LIKE 'Retreat:%' OR title LIKE 'Festival:%' OR title LIKE 'Symposium:%'))");
  await db.query("DELETE FROM registrations WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'Summit:%' OR title LIKE 'Expo:%' OR title LIKE 'Lab:%' OR title LIKE 'Meetup:%' OR title LIKE 'Forum:%' OR title LIKE 'Bootcamp:%' OR title LIKE 'Retreat:%' OR title LIKE 'Festival:%' OR title LIKE 'Symposium:%')");
  await db.query("DELETE FROM gallery_likes WHERE gallery_item_id IN (SELECT id FROM gallery_items WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'Summit:%' OR title LIKE 'Expo:%' OR title LIKE 'Lab:%' OR title LIKE 'Meetup:%' OR title LIKE 'Forum:%' OR title LIKE 'Bootcamp:%' OR title LIKE 'Retreat:%' OR title LIKE 'Festival:%' OR title LIKE 'Symposium:%'))");
  await db.query("DELETE FROM comment_hearts WHERE comment_id IN (SELECT id FROM event_comments WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'Summit:%' OR title LIKE 'Expo:%' OR title LIKE 'Lab:%' OR title LIKE 'Meetup:%' OR title LIKE 'Forum:%' OR title LIKE 'Bootcamp:%' OR title LIKE 'Retreat:%' OR title LIKE 'Festival:%' OR title LIKE 'Symposium:%'))");
  await db.query("DELETE FROM event_tags WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'Summit:%' OR title LIKE 'Expo:%' OR title LIKE 'Lab:%' OR title LIKE 'Meetup:%' OR title LIKE 'Forum:%' OR title LIKE 'Bootcamp:%' OR title LIKE 'Retreat:%' OR title LIKE 'Festival:%' OR title LIKE 'Symposium:%')");
  await db.query("DELETE FROM event_comments WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'Summit:%' OR title LIKE 'Expo:%' OR title LIKE 'Lab:%' OR title LIKE 'Meetup:%' OR title LIKE 'Forum:%' OR title LIKE 'Bootcamp:%' OR title LIKE 'Retreat:%' OR title LIKE 'Festival:%' OR title LIKE 'Symposium:%')");
  await db.query("DELETE FROM feedback WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'Summit:%' OR title LIKE 'Expo:%' OR title LIKE 'Lab:%' OR title LIKE 'Meetup:%' OR title LIKE 'Forum:%' OR title LIKE 'Bootcamp:%' OR title LIKE 'Retreat:%' OR title LIKE 'Festival:%' OR title LIKE 'Symposium:%')");
  await db.query("DELETE FROM gallery_items WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'Summit:%' OR title LIKE 'Expo:%' OR title LIKE 'Lab:%' OR title LIKE 'Meetup:%' OR title LIKE 'Forum:%' OR title LIKE 'Bootcamp:%' OR title LIKE 'Retreat:%' OR title LIKE 'Festival:%' OR title LIKE 'Symposium:%')");
  await db.query('DELETE FROM user_follows WHERE follower_id = ANY($1::uuid[]) OR following_id = ANY($1::uuid[])', [[...organizerIds, ...attendeeIds]]);
  await db.query("DELETE FROM events WHERE title LIKE 'Summit:%' OR title LIKE 'Expo:%' OR title LIKE 'Lab:%' OR title LIKE 'Meetup:%' OR title LIKE 'Forum:%' OR title LIKE 'Bootcamp:%' OR title LIKE 'Retreat:%' OR title LIKE 'Festival:%' OR title LIKE 'Symposium:%'");

  for (const attendeeId of attendeeIds) {
    const targetOrganizerId = pick(organizerIds, attendeeIds.indexOf(attendeeId));
    await db.query(
      'INSERT INTO user_follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [attendeeId, targetOrganizerId]
    );
  }

  for (let index = 0; index < 36; index += 1) {
    const payload = buildEventPayload(index, categoryMap, organizerIds);

    const inserted = await db.query(
      `INSERT INTO events (
        title, description, category_id, start_date, end_date, type, location, capacity,
        organizer_id, status, banner_url, thumbnail_url, gallery_urls, approved_at, approved_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10::varchar, $11, $12, $13::jsonb,
        CASE WHEN $10::varchar = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END,
        CASE WHEN $10::varchar = 'published' THEN $14::uuid ELSE NULL END
      ) RETURNING id`,
      [
        payload.title,
        payload.description,
        payload.categoryId,
        payload.startDate,
        payload.endDate,
        payload.type,
        payload.location,
        payload.capacity,
        payload.organizerId,
        payload.status,
        payload.bannerUrl,
        payload.thumbnailUrl,
        JSON.stringify(payload.galleryUrls),
        adminId
      ]
    );

    const eventId = inserted.rows[0].id;
    const eventTags = [pick(tagNames, index), pick(tagNames, index + 2)];

    for (const tagName of eventTags) {
      await db.query(
        'INSERT INTO event_tags (event_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [eventId, tagMap[tagName]]
      );
    }

    if (payload.status === 'completed') {
      const eventAttendees = attendeeIds.slice(0, 3 + (index % 2));

      for (let attendeeIndex = 0; attendeeIndex < eventAttendees.length; attendeeIndex += 1) {
        const attendeeId = eventAttendees[attendeeIndex];
        const registrationRes = await db.query(
          `INSERT INTO registrations (event_id, user_id, status)
           VALUES ($1, $2, 'confirmed')
           RETURNING id`,
          [eventId, attendeeId]
        );

        const registrationId = registrationRes.rows[0].id;
        const code = ticketCode();
        const ticketRes = await db.query(
          `INSERT INTO tickets (registration_id, ticket_code, hmac_signature)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [registrationId, code, ticketSignature(code)]
        );

        await db.query(
          'INSERT INTO check_ins (ticket_id, scanned_by) VALUES ($1, $2)',
          [ticketRes.rows[0].id, payload.organizerId]
        );

        await db.query(
          `INSERT INTO feedback (event_id, user_id, rating, comment, photo_url)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            eventId,
            attendeeId,
            4 + (attendeeIndex % 2),
            pick(reviewComments, index + attendeeIndex),
            attendeeIndex % 2 === 0 ? pick(imagePool, index + attendeeIndex + 2) : null
          ]
        );

        await db.query(
          `INSERT INTO gallery_items (event_id, user_id, photo_url, upload_phase)
           VALUES ($1, $2, $3, $4)`,
          [eventId, attendeeId, pick(imagePool, index + attendeeIndex + 4), 'post']
        );
      }

      await db.query(
        `INSERT INTO feedback (event_id, user_id, rating, comment, photo_url)
         VALUES ($1, $2, $3, $4, $5)`,
        [eventId, payload.organizerId, 5, 'Proud of how the event ran from start to finish.', pick(imagePool, index + 9)]
      );

      await db.query(
        `INSERT INTO gallery_items (event_id, user_id, photo_url, upload_phase)
         VALUES ($1, $2, $3, 'pre')`,
        [eventId, payload.organizerId, pick(imagePool, index + 6)]
      );

      await db.query(
        `INSERT INTO gallery_items (event_id, user_id, photo_url, upload_phase)
         VALUES ($1, $2, $3, 'post')`,
        [eventId, adminId, pick(imagePool, index + 7)]
      );

      const insertedCommentIds = [];
      for (let commentIndex = 0; commentIndex < 3; commentIndex += 1) {
        const commenterId = attendeeIds[(index + commentIndex) % attendeeIds.length];
        const commentRes = await db.query(
          `INSERT INTO event_comments (event_id, user_id, content)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [eventId, commenterId, pick(eventComments, index + commentIndex)]
        );
        insertedCommentIds.push(commentRes.rows[0].id);
      }

      for (let replyIndex = 0; replyIndex < insertedCommentIds.length - 1; replyIndex += 1) {
        await db.query(
          `INSERT INTO event_comments (event_id, user_id, content, parent_id)
           VALUES ($1, $2, $3, $4)`,
          [
            eventId,
            replyIndex % 2 === 0 ? payload.organizerId : adminId,
            replyIndex % 2 === 0 ? 'Thanks for joining us. We are glad you had a great experience.' : 'Appreciate the feedback. We are already planning the next edition.',
            insertedCommentIds[replyIndex]
          ]
        );
      }

      for (const commentId of insertedCommentIds) {
        await db.query(
          `INSERT INTO comment_hearts (comment_id, user_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [commentId, payload.organizerId]
        );
      }
    }
  }

  await normalizeUserRoles({ adminId, organizerIds });
  await normalizeEventStatuses();
  const allUsersRes = await db.query('SELECT id FROM users ORDER BY created_at ASC, id ASC');
  const allEventsRes = await db.query('SELECT id FROM events ORDER BY created_at ASC, id ASC');
  const allUserIds = allUsersRes.rows.map((row) => row.id);
  const allEventIds = allEventsRes.rows.map((row) => row.id);
  await ensureRecentRegistrations({ minCount: 45, userIds: allUserIds, eventIds: allEventIds });
  await normalizeRegistrationsCreatedAt();
  await ensureTicketsForRegistrations();
  await ensureCheckInsForCompletedEvents({ fallbackScannerId: adminId });
  await ensureAdminAttended({ adminId });
  await ensureSeedSocialData({ adminId, organizerIds });

  console.log('Seeded 36 events with social data, banners, and gallery images.');
};

seedEvents()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.pool.end();
  });
