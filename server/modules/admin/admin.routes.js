const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { authenticate, requireRole } = require('../../middleware/auth');

router.get('/users', authenticate, requireRole(['admin']), adminController.listUsers);
router.put('/users/:id/status', authenticate, requireRole(['admin']), adminController.toggleUserSuspension);
router.get('/events', authenticate, requireRole(['admin']), adminController.listAllEvents);
router.post('/events/:id/force-cancel', authenticate, requireRole(['admin']), adminController.forceCancelEvent);
router.get('/analytics', authenticate, requireRole(['admin']), adminController.getPlatformAnalytics);

module.exports = router;
