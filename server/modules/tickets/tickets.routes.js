const express = require('express');
const router = express.Router();
const ticketsController = require('./tickets.controller');
const { authenticate } = require('../../middleware/auth');

router.get('/:id', authenticate, ticketsController.getTicketDetails);
router.get('/:id/pdf', authenticate, ticketsController.downloadTicketPdf);

module.exports = router;
