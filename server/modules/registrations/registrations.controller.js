const { z } = require('zod');
const registrationsService = require('./registrations.service');

const registerSchema = z.object({
  eventId: z.string().uuid(),
  members: z.array(
    z.object({
      name: z.string().min(1),
      email: z.string().email()
    })
  ).optional()
});

const register = async (req, res, next) => {
  try {
    const validated = registerSchema.parse(req.body);
    const result = await registrationsService.register(req.user.id, validated);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    next(error);
  }
};

const cancelRegistration = async (req, res, next) => {
  try {
    const result = await registrationsService.cancelRegistration(req.params.id, req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const listMyRegistrations = async (req, res, next) => {
  try {
    const result = await registrationsService.listMyRegistrations(req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const listEventRegistrations = async (req, res, next) => {
  try {
    const result = await registrationsService.listEventRegistrations(req.params.eventId, req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  cancelRegistration,
  listMyRegistrations,
  listEventRegistrations
};
