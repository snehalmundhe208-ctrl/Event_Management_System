const express = require('express');
const router = express.Router();
const feedbackController = require('./feedback.controller');
const { authenticate } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

router.post('/', authenticate, upload.single('photo'), feedbackController.submitFeedback);
router.get('/event/:eventId', feedbackController.listFeedback);
router.get('/event/:eventId/summary', feedbackController.getRatingSummary);

module.exports = router;
