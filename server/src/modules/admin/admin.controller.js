const { z } = require('zod');
const adminService = require('./admin.service');

const toggleSuspensionSchema = z.object({
  isSuspended: z.boolean()
});

const listUsers = async (req, res, next) => {
  try {
    const search = req.query.search;
    const result = await adminService.listUsers(search);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const toggleUserSuspension = async (req, res, next) => {
  try {
    const { isSuspended } = toggleSuspensionSchema.parse(req.body);
    const result = await adminService.toggleUserSuspension(req.params.id, isSuspended);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    next(error);
  }
};

const listAllEvents = async (req, res, next) => {
  try {
    const search = req.query.search;
    const result = await adminService.listAllEvents(search);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const forceCancelEvent = async (req, res, next) => {
  try {
    const result = await adminService.forceCancelEvent(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getPlatformAnalytics = async (req, res, next) => {
  try {
    const result = await adminService.getPlatformAnalytics();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listUsers,
  toggleUserSuspension,
  listAllEvents,
  forceCancelEvent,
  getPlatformAnalytics
};
