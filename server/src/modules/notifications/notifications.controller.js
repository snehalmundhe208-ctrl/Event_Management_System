const notificationsService = require('./notifications.service');

const listMyNotifications = async (req, res, next) => {
  try {
    const result = await notificationsService.listMyNotifications(req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const result = await notificationsService.markAsRead(req.params.id, req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listMyNotifications,
  markAsRead
};
