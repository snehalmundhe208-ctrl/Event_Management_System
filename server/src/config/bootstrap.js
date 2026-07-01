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

  await db.query(`
    ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS event_comments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    ALTER TABLE event_comments
    ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES event_comments(id) ON DELETE CASCADE
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_follows (
      follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (follower_id, following_id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS comment_hearts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      comment_id UUID NOT NULL REFERENCES event_comments(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_comment_heart UNIQUE (comment_id, user_id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS gallery_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      photo_url VARCHAR(512) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    ALTER TABLE gallery_items
    ADD COLUMN IF NOT EXISTS upload_phase VARCHAR(20) NOT NULL DEFAULT 'post'
  `);

  await db.query('CREATE INDEX IF NOT EXISTS idx_notifications_event ON notifications(event_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_event_comments_parent ON event_comments(parent_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_comment_hearts_comment ON comment_hearts(comment_id)');
};

module.exports = {
  bootstrapDatabase
};
