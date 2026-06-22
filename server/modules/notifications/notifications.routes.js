const express = require('express');
const router = express.Router();
const notificationsController = require('./notifications.controller');
const { authenticate } = require('../../middleware/auth');

router.get('/', authenticate, notificationsController.listMyNotifications);
router.put('/:id/read', authenticate, notificationsController.markAsRead);

module.exports = router;
