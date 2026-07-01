const express = require('express');
const router = express.Router();
const eventsController = require('./events.controller');
const { authenticate, optionalAuthenticate, requireRole } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

router.get('/', eventsController.listEvents);
router.get('/categories', eventsController.listCategories);
router.get('/tags', eventsController.listTags);
router.get('/:id', optionalAuthenticate, eventsController.getEvent);

router.post('/', authenticate, requireRole(['organizer', 'admin']), eventsController.createEvent);
router.put('/:id', authenticate, requireRole(['organizer', 'admin']), eventsController.updateEvent);
router.post('/:id/publish', authenticate, requireRole(['admin']), eventsController.publishEvent);
router.post('/:id/reject', authenticate, requireRole(['admin']), eventsController.rejectEvent);
router.post('/:id/cancel', authenticate, requireRole(['organizer', 'admin']), eventsController.cancelEvent);
router.post('/:id/complete', authenticate, requireRole(['organizer', 'admin']), eventsController.completeEvent);
router.get('/:id/certificate/download', authenticate, eventsController.downloadCertificate);
router.post('/:id/banner', authenticate, requireRole(['organizer', 'admin']), upload.single('banner'), eventsController.uploadBanner);
router.post('/:id/gallery', authenticate, requireRole(['organizer', 'admin']), upload.array('photos', 8), eventsController.uploadGallery);

module.exports = router;
