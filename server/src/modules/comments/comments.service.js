const db = require('../../config/db');

const CREATOR_ROLES = ['admin', 'organizer'];

const getEventContext = async (eventId) => {
  const res = await db.query(
    'SELECT id, status, organizer_id FROM events WHERE id = $1',
    [eventId]
  );

  if (res.rows.length === 0) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  return res.rows[0];
};

const assertCommentableEvent = async (eventId) => {
  const event = await getEventContext(eventId);

  if (!['published', 'completed'].includes(event.status)) {
    const error = new Error('Comments are only available on public events');
    error.statusCode = 400;
    throw error;
  }

  return event;
};

const commentCanBeHearted = (commenterRoles, currentUser) => {
  if (!currentUser || !Array.isArray(currentUser.roles)) {
    return false;
  }

  const isCreator = currentUser.roles.some((role) => CREATOR_ROLES.includes(role));
  const isUserComment = !(commenterRoles || []).some((role) => CREATOR_ROLES.includes(role));

  return isCreator && isUserComment;
};

const hydrateComments = (rows, currentUser) => {
  const byId = new Map();

  rows.forEach((row) => {
    byId.set(row.id, {
      id: row.id,
      event_id: row.event_id,
      user_id: row.user_id,
      user_name: row.user_name,
      content: row.content,
      created_at: row.created_at,
      parent_id: row.parent_id,
      hearts_count: row.hearts_count,
      is_hearted: row.is_hearted,
      can_heart: commentCanBeHearted(row.user_roles, currentUser) && currentUser?.id !== row.user_id,
      replies: []
    });
  });

  const topLevel = [];

  byId.forEach((comment) => {
    if (comment.parent_id) {
      const parent = byId.get(comment.parent_id);
      if (parent) {
        parent.replies.push(comment);
      }
      return;
    }

    topLevel.push(comment);
  });

  return topLevel;
};

const listComments = async (eventId, currentUser) => {
  await getEventContext(eventId);

  const res = await db.query(
    `SELECT
       ec.id,
       ec.event_id,
       ec.user_id,
       ec.content,
       ec.created_at,
       ec.parent_id,
       u.name AS user_name,
       u.roles AS user_roles,
       COUNT(ch.id)::int AS hearts_count,
       EXISTS(
         SELECT 1
         FROM comment_hearts current_heart
         WHERE current_heart.comment_id = ec.id
           AND current_heart.user_id = $2
       ) AS is_hearted
     FROM event_comments ec
     JOIN users u ON u.id = ec.user_id
     LEFT JOIN comment_hearts ch ON ch.comment_id = ec.id
     WHERE ec.event_id = $1
     GROUP BY ec.id, u.name, u.roles
     ORDER BY ec.created_at ASC`,
    [eventId, currentUser?.id || null]
  );

  return hydrateComments(res.rows, currentUser);
};

const createComment = async (eventId, userId, content, parentId) => {
  await assertCommentableEvent(eventId);

  let parentCommentId = null;

  if (parentId) {
    const parentRes = await db.query(
      'SELECT id, parent_id FROM event_comments WHERE id = $1 AND event_id = $2',
      [parentId, eventId]
    );

    if (parentRes.rows.length === 0) {
      const error = new Error('Parent comment not found');
      error.statusCode = 404;
      throw error;
    }

    if (parentRes.rows[0].parent_id) {
      const error = new Error('Only one level of replies is supported');
      error.statusCode = 400;
      throw error;
    }

    parentCommentId = parentRes.rows[0].id;
  }

  const res = await db.query(
    `INSERT INTO event_comments (event_id, user_id, content, parent_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, event_id, user_id, content, created_at, parent_id`,
    [eventId, userId, content, parentCommentId]
  );

  const comment = res.rows[0];
  const userRes = await db.query('SELECT name FROM users WHERE id = $1', [userId]);

  return {
    ...comment,
    user_name: userRes.rows[0]?.name || 'User',
    hearts_count: 0,
    is_hearted: false,
    can_heart: false,
    replies: []
  };
};

const toggleCommentHeart = async (eventId, commentId, user) => {
  const commentRes = await db.query(
    `SELECT ec.id, ec.user_id, ec.event_id, commenter.roles AS commenter_roles
     FROM event_comments ec
     JOIN users commenter ON commenter.id = ec.user_id
     WHERE ec.id = $1 AND ec.event_id = $2`,
    [commentId, eventId]
  );

  if (commentRes.rows.length === 0) {
    const error = new Error('Comment not found');
    error.statusCode = 404;
    throw error;
  }

  const comment = commentRes.rows[0];

  if (!commentCanBeHearted(comment.commenter_roles, user) || comment.user_id === user.id) {
    const error = new Error('Only admins and organizers can heart attendee comments');
    error.statusCode = 403;
    throw error;
  }

  const existingRes = await db.query(
    'SELECT id FROM comment_hearts WHERE comment_id = $1 AND user_id = $2',
    [commentId, user.id]
  );

  if (existingRes.rows.length > 0) {
    await db.query('DELETE FROM comment_hearts WHERE id = $1', [existingRes.rows[0].id]);
    return { hearted: false };
  }

  await db.query(
    'INSERT INTO comment_hearts (comment_id, user_id) VALUES ($1, $2)',
    [commentId, user.id]
  );

  return { hearted: true };
};

module.exports = {
  listComments,
  createComment,
  toggleCommentHeart
};
