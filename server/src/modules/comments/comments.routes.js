const express = require('express');
const commentsController = require('./comments.controller');
const { authenticate, optionalAuthenticate, requireRole } = require('../../middleware/auth');

const router = express.Router({ mergeParams: true });

router.get('/', optionalAuthenticate, commentsController.listComments);
router.post('/', authenticate, commentsController.createComment);
router.post('/:commentId/heart', authenticate, requireRole(['admin', 'organizer']), commentsController.toggleCommentHeart);

module.exports = router;
