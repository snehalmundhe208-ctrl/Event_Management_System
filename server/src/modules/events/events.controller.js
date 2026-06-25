const { z } = require('zod');
const eventsService = require('./events.service');

const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  categoryId: z.string().uuid().nullable().optional(),
  startDate: z.string(),
  endDate: z.string(),
  type: z.enum(['in-person', 'online', 'hybrid']),
  location: z.string().nullable().optional(),
  capacity: z.coerce.number().int().positive(),
  tags: z.array(z.string().uuid()).optional()
});

const updateEventSchema = createEventSchema.partial();

const listCategories = async (req, res, next) => {
  try {
    const result = await eventsService.listCategories();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const listTags = async (req, res, next) => {
  try {
    const result = await eventsService.listTags();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const listEvents = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      keyword: req.query.keyword,
      categoryId: req.query.categoryId,
      tagId: req.query.tagId,
      type: req.query.type,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      organizerId: req.query.organizerId
    };
    const result = await eventsService.listEvents(filters);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getEvent = async (req, res, next) => {
  try {
    const result = await eventsService.getEvent(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const createEvent = async (req, res, next) => {
  try {
    const validated = createEventSchema.parse(req.body);
    const result = await eventsService.createEvent(validated, req.user.id);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    next(error);
  }
};

const updateEvent = async (req, res, next) => {
  try {
    const validated = updateEventSchema.parse(req.body);
    const result = await eventsService.updateEvent(req.params.id, validated, req.user);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    next(error);
  }
};

const publishEvent = async (req, res, next) => {
  try {
    const result = await eventsService.publishEvent(req.params.id, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const cancelEvent = async (req, res, next) => {
  try {
    const result = await eventsService.cancelEvent(req.params.id, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const uploadBanner = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Banner file is required' });
    }
    const relativePath = `/uploads/${req.file.filename}`;
    const result = await eventsService.uploadBanner(req.params.id, relativePath, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const completeEvent = async (req, res, next) => {
  try {
    const result = await eventsService.completeEvent(req.params.id, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const downloadCertificate = async (req, res, next) => {
  try {
    const cert = await eventsService.getCertificate(req.params.id, req.user.id);
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ layout: 'landscape', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${req.params.id}.pdf"`);

    doc.pipe(res);

    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).strokeWidth(4).stroke('#4A5568');
    doc.rect(25, 25, doc.page.width - 50, doc.page.height - 50).strokeWidth(1).stroke('#718096');

    doc.moveDown(4);
    doc.fontSize(36).fillColor('#2D3748').text('CERTIFICATE OF PARTICIPATION', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(16).fillColor('#4A5568').text('This is proudly presented to', { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(28).fillColor('#1A202C').text(cert.attendee_name, { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(16).fillColor('#4A5568').text(`for active participation in the event`, { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(22).fillColor('#2B6CB0').text(cert.event_title, { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(14).fillColor('#718096').text(`Completed on: ${new Date(cert.end_date).toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(3);
    doc.fontSize(12).fillColor('#A0AEC0').text(`Certificate ID: ${cert.id}`, { align: 'center' });

    doc.end();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listCategories,
  listTags,
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  publishEvent,
  cancelEvent,
  completeEvent,
  downloadCertificate,
  uploadBanner
};
