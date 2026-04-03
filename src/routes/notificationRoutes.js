const express = require('express');
const router = express.Router();
const { notificationController } = require('../controllers');
const { protect } = require('../middleware/authMiddleware');


router.get(
  '/',
  protect,
  notificationController.getNotifications
);


router.get(
  '/unread/count',
  protect,
  notificationController.getUnreadCount
);


router.get(
  '/type/:type',
  protect,
  notificationController.getNotificationsByType
);


router.put(
  '/:id/read',
  protect,
  notificationController.markAsRead
);


router.put(
  '/read-all',
  protect,
  notificationController.markAllAsRead
);


router.delete(
  '/:id',
  protect,
  notificationController.deleteNotification
);


router.delete(
  '/clear-all',
  protect,
  notificationController.deleteAllNotifications
);

module.exports = router;
