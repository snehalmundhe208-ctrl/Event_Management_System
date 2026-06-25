const { z } = require('zod');
const galleryService = require('./gallery.service');

const uploadPhotoSchema = z.object({
  eventId: z.string().uuid()
});

const uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Photo file is required' });
    }
    const { eventId } = uploadPhotoSchema.parse(req.body);
    const relativePath = `/uploads/${req.file.filename}`;
    const result = await galleryService.uploadPhoto(req.user.id, eventId, relativePath);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    next(error);
  }
};

const listGalleryItems = async (req, res, next) => {
  try {
    const result = await galleryService.listGalleryItems(req.params.eventId, req.query.userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const likeGalleryItem = async (req, res, next) => {
  try {
    const result = await galleryService.likeGalleryItem(req.params.itemId, req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadPhoto,
  listGalleryItems,
  likeGalleryItem
};
