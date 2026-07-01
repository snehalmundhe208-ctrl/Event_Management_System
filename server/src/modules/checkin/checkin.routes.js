const express = require('express');
const router = express.Router();
const checkinController = require('./checkin.controller');
const { authenticate, requireRole } = require('../../middleware/auth');

router.post('/scan', authenticate, requireRole(['organizer', 'admin']), checkinController.scanCheckIn);
router.post('/manual', authenticate, requireRole(['organizer', 'admin']), checkinController.manualCheckIn);
router.get('/event/:eventId/mine', authenticate, checkinController.getMyCheckInStatus);
router.get('/event/:eventId', authenticate, requireRole(['organizer', 'admin']), checkinController.listCheckIns);

module.exports = router;
