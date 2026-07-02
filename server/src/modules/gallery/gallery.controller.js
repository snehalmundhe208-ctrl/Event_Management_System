const { z } = require('zod');
const fs = require('fs/promises');
const path = require('path');
const http = require('http');
const https = require('https');
const PDFDocument = require('pdfkit');
const galleryService = require('./gallery.service');
const { uploadBuffer } = require('../../config/cloudinary');

const uploadPhotoSchema = z.object({
  eventId: z.string().uuid()
});

const exportSchema = z.object({
  photoUrl: z.string().min(1),
  filename: z.string().optional(),
  title: z.string().optional()
});

const fetchImageBuffer = async (photoUrl) => {
  if (photoUrl.startsWith('/uploads/')) {
    const filePath = path.join(__dirname, '../../../', photoUrl.replace(/^\//, ''));
    return fs.readFile(filePath);
  }

  const url = new URL(photoUrl);
  const client = url.protocol === 'http:' ? http : https;

  return new Promise((resolve, reject) => {
    client.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        fetchImageBuffer(response.headers.location).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error('Failed to fetch image'));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
};

const uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Photo file is required' });
    }
    const { eventId } = uploadPhotoSchema.parse(req.body);
    const secureUrl = await uploadBuffer(req.file.buffer, 'event-management/attendee-gallery', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype
    });
    const result = await galleryService.uploadPhoto(req.user, eventId, secureUrl);
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

const downloadGalleryPdf = async (req, res, next) => {
  try {
    const { photoUrl, filename, title } = exportSchema.parse(req.query);
    const buffer = await fetchImageBuffer(photoUrl);
    const doc = new PDFDocument({ margin: 36 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'gallery-export'}.pdf"`);

    doc.pipe(res);
    doc.fontSize(18).text(title || 'Gallery Export', { align: 'center' });
    doc.moveDown(1);
    doc.image(buffer, {
      fit: [doc.page.width - 72, doc.page.height - 144],
      align: 'center',
      valign: 'center'
    });
    doc.end();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    next(error);
  }
};

const downloadGalleryJpeg = async (req, res, next) => {
  try {
    const { photoUrl, filename } = exportSchema.parse(req.query);
    const buffer = await fetchImageBuffer(photoUrl);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'gallery-export'}.jpg"`);
    res.status(200).send(buffer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    next(error);
  }
};

module.exports = {
  uploadPhoto,
  listGalleryItems,
  likeGalleryItem,
  downloadGalleryPdf,
  downloadGalleryJpeg
};
