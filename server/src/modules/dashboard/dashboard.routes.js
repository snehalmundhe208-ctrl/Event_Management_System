const express = require('express');
const router = express.Router();
const dashboardController = require('./dashboard.controller');
const { authenticate, requireRole } = require('../../middleware/auth');

router.get('/event/:eventId', authenticate, requireRole(['organizer', 'admin']), dashboardController.getEventStats);
router.get('/event/:eventId/export-csv', authenticate, requireRole(['organizer', 'admin']), dashboardController.exportRegistrantsCsv);

module.exports = router;