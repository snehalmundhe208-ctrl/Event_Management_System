const { z } = require('zod');
const commentsService = require('./comments.service');

const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  parentId: z.string().uuid().optional().nullable()
});

const listComments = async (req, res, next) => {
  try {
    const result = await commentsService.listComments(req.params.eventId, req.user || null);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const createComment = async (req, res, next) => {
  try {
    const { content, parentId } = createCommentSchema.parse(req.body);
    const result = await commentsService.createComment(req.params.eventId, req.user.id, content, parentId);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    next(error);
  }
};

const toggleCommentHeart = async (req, res, next) => {
  try {
    const result = await commentsService.toggleCommentHeart(req.params.eventId, req.params.commentId, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listComments,
  createComment,
  toggleCommentHeart
};
