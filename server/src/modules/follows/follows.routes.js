const express = require('express');
const followsController = require('./follows.controller');
const { authenticate, optionalAuthenticate } = require('../../middleware/auth');

const router = express.Router();

router.get('/:userId', optionalAuthenticate, followsController.getProfileStats);
router.post('/:userId/toggle', authenticate, followsController.toggleFollow);

module.exports = router;
