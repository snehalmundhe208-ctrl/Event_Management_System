const { z } = require('zod');
const feedbackService = require('./feedback.service');
const { uploadBuffer } = require('../../config/cloudinary');

const submitFeedbackSchema = z.object({
  eventId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().optional()
});

const submitFeedback = async (req, res, next) => {
  try {
    const validated = submitFeedbackSchema.parse(req.body);
    let photoUrl = null;

    if (req.file) {
      photoUrl = await uploadBuffer(req.file.buffer, 'event-management/feedback');
    }

    const result = await feedbackService.submitFeedback(req.user.id, { ...validated, photoUrl });
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    next(error);
  }
};

const listFeedback = async (req, res, next) => {
  try {
    const result = await feedbackService.listFeedback(req.params.eventId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getRatingSummary = async (req, res, next) => {
  try {
    const result = await feedbackService.getRatingSummary(req.params.eventId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitFeedback,
  listFeedback,
  getRatingSummary
};
