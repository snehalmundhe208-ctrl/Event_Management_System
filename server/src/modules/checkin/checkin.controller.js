const { z } = require('zod');
const checkinService = require('./checkin.service');

const scanSchema = z.object({
  ticketCode: z.string(),
  signature: z.string()
});

const manualSchema = z.object({
  ticketCode: z.string()
});

const scanCheckIn = async (req, res, next) => {
  try {
    const validated = scanSchema.parse(req.body);
    const result = await checkinService.scanCheckIn(validated, req.user.id);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    next(error);
  }
};

const manualCheckIn = async (req, res, next) => {
  try {
    const validated = manualSchema.parse(req.body);
    const result = await checkinService.manualCheckIn(validated, req.user.id);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    next(error);
  }
};

const listCheckIns = async (req, res, next) => {
  try {
    const result = await checkinService.listCheckIns(req.params.eventId, req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  scanCheckIn,
  manualCheckIn,
  listCheckIns
};
