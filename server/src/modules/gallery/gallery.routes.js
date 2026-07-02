const express = require('express');
const router = express.Router();
const galleryController = require('./gallery.controller');
const { authenticate, optionalAuthenticate, requireRole } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

router.post('/', authenticate, upload.single('photo'), galleryController.uploadPhoto);
router.get('/event/:eventId', optionalAuthenticate, galleryController.listGalleryItems);
router.get('/export/pdf', galleryController.downloadGalleryPdf);
router.get('/export/jpeg', galleryController.downloadGalleryJpeg);
router.post('/item/:itemId/like', authenticate, galleryController.likeGalleryItem);
router.delete('/item/:itemId', authenticate, requireRole(['admin']), galleryController.deleteGalleryItem);

module.exports = router;
