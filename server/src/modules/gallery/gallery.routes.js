const express = require('express');
const router = express.Router();
const galleryController = require('./gallery.controller');
const { authenticate } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

router.post('/', authenticate, upload.single('photo'), galleryController.uploadPhoto);
router.get('/event/:eventId', galleryController.listGalleryItems);
router.post('/item/:itemId/like', authenticate, galleryController.likeGalleryItem);

module.exports = router;
