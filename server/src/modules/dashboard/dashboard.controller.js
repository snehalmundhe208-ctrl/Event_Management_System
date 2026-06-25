const dashboardService = require('./dashboard.service');

const getEventStats = async (req, res, next) => {
  try {
    const result = await dashboardService.getEventStats(req.params.eventId, req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const exportRegistrantsCsv = async (req, res, next) => {
  try {
    const result = await dashboardService.exportRegistrantsCsv(req.params.eventId, req.user.id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.status(200).send(result.data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEventStats,
  exportRegistrantsCsv
};
