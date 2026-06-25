const express = require('express');
const router = express.Router();
const eventsController = require('./events.controller');
const { authenticate, requireRole } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

router.get('/', eventsController.listEvents);
router.get('/categories', eventsController.listCategories);
router.get('/tags', eventsController.listTags);
router.get('/:id', eventsController.getEvent);

router.post('/', authenticate, requireRole(['organizer', 'admin']), eventsController.createEvent);
router.put('/:id', authenticate, requireRole(['organizer', 'admin']), eventsController.updateEvent);
router.post('/:id/publish', authenticate, requireRole(['organizer', 'admin']), eventsController.publishEvent);
router.post('/:id/cancel', authenticate, requireRole(['organizer', 'admin']), eventsController.cancelEvent);
router.post('/:id/complete', authenticate, requireRole(['organizer', 'admin']), eventsController.completeEvent);
router.get('/:id/certificate/download', authenticate, eventsController.downloadCertificate);
router.post('/:id/banner', authenticate, requireRole(['organizer', 'admin']), upload.single('banner'), eventsController.uploadBanner);

module.exports = router;
