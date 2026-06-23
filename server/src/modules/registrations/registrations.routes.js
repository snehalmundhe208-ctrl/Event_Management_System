const express = require('express');
const router = express.Router();
const registrationsController = require('./registrations.controller');
const { authenticate, requireRole } = require('../../middleware/auth');

router.post('/', authenticate, registrationsController.register);
router.delete('/:id', authenticate, registrationsController.cancelRegistration);
router.get('/my', authenticate, registrationsController.listMyRegistrations);
router.get('/event/:eventId', authenticate, requireRole(['organizer', 'admin']), registrationsController.listEventRegistrations);

module.exports = router;
