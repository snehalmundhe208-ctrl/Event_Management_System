require('dotenv').config();
const bcrypt = require('bcrypt');
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

const pick = (array, index) => array[index % array.length];
const chunkImages = (index) => {
  const total = 2 + (index % 3);
  return Array.from({ length: total }, (_, offset) => pick(imagePool, index + offset + 1));
};

const ensureUser = async (email, name, roles) => {
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
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
  const organizerIds = [organizerA, organizerB, adminId];

  const categoryMap = await ensureLookupRows('categories', categoryNames);
  const tagMap = await ensureLookupRows('tags', tagNames);

  await db.query("DELETE FROM event_tags WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'Summit:%' OR title LIKE 'Expo:%' OR title LIKE 'Lab:%' OR title LIKE 'Meetup:%' OR title LIKE 'Forum:%' OR title LIKE 'Bootcamp:%' OR title LIKE 'Retreat:%' OR title LIKE 'Festival:%' OR title LIKE 'Symposium:%')");
  await db.query("DELETE FROM feedback WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'Summit:%' OR title LIKE 'Expo:%' OR title LIKE 'Lab:%' OR title LIKE 'Meetup:%' OR title LIKE 'Forum:%' OR title LIKE 'Bootcamp:%' OR title LIKE 'Retreat:%' OR title LIKE 'Festival:%' OR title LIKE 'Symposium:%')");
  await db.query("DELETE FROM gallery_items WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'Summit:%' OR title LIKE 'Expo:%' OR title LIKE 'Lab:%' OR title LIKE 'Meetup:%' OR title LIKE 'Forum:%' OR title LIKE 'Bootcamp:%' OR title LIKE 'Retreat:%' OR title LIKE 'Festival:%' OR title LIKE 'Symposium:%')");
  await db.query("DELETE FROM events WHERE title LIKE 'Summit:%' OR title LIKE 'Expo:%' OR title LIKE 'Lab:%' OR title LIKE 'Meetup:%' OR title LIKE 'Forum:%' OR title LIKE 'Bootcamp:%' OR title LIKE 'Retreat:%' OR title LIKE 'Festival:%' OR title LIKE 'Symposium:%'");

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
  }

  console.log('Seeded 36 events with banners and gallery images.');
};

seedEvents()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.pool.end();
  });
