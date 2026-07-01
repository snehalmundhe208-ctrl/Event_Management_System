const db = require('./db');

const bootstrapDatabase = async () => {
  await db.query(`
    ALTER TABLE events
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
    ADD COLUMN IF NOT EXISTS gallery_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS approved_by UUID,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT
  `);

  await db.query(`
    ALTER TABLE feedback
    ADD COLUMN IF NOT EXISTS photo_url TEXT
  `);
};

module.exports = {
  bootstrapDatabase
};
