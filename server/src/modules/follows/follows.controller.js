const followsService = require('./follows.service');

const getProfileStats = async (req, res, next) => {
  try {
    const result = await followsService.getProfileStats(req.params.userId, req.user?.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const toggleFollow = async (req, res, next) => {
  try {
    const result = await followsService.toggleFollow(req.params.userId, req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfileStats,
  toggleFollow
};
