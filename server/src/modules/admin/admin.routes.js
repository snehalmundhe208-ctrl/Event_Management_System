const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { authenticate, requireRole } = require('../../middleware/auth');

router.get('/users', authenticate, requireRole(['admin']), adminController.listUsers);
router.put('/users/:id/status', authenticate, requireRole(['admin']), adminController.toggleUserSuspension);
router.get('/events', authenticate, requireRole(['admin']), adminController.listAllEvents);
router.get('/events/pending-approvals', authenticate, requireRole(['admin']), adminController.listPendingApprovals);
router.post('/events/:id/approve', authenticate, requireRole(['admin']), adminController.approveEvent);
router.post('/events/:id/reject', authenticate, requireRole(['admin']), adminController.rejectEvent);
router.post('/events/:id/force-cancel', authenticate, requireRole(['admin']), adminController.forceCancelEvent);
router.get('/analytics', authenticate, requireRole(['admin']), adminController.getPlatformAnalytics);

module.exports = router;
