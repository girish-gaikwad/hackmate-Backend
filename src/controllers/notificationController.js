const Notification = require('../models/Notification');
const { ApiError, ApiResponse, asyncHandler } = require('../utils');

/**
 * @desc    Get all notifications
 * @route   GET /api/v1/notifications
 * @access  Private
 */
const getNotifications = asyncHandler(async (req, res) => {
  const { type, isRead, page = 1, limit = 20 } = req.query;

  const filter = { recipient: req.user._id };

  if (type) {
    filter.type = type;
  }

  if (typeof isRead !== 'undefined') {
    filter.isRead = isRead === 'true';
  }

  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate('sender', 'firstName lastName profilePicture')
      .populate('relatedTeam', 'name')
      .populate('relatedHackathon', 'name')
      .populate('relatedRequest', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);

  res.json(
    new ApiResponse(200, {
      notifications,
      unreadCount,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    }, 'Notifications retrieved successfully')
  );
});

/**
 * @desc    Get unread notifications count
 * @route   GET /api/v1/notifications/unread-count
 * @access  Private
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false,
  });

  res.json(
    new ApiResponse(200, { unreadCount: count }, 'Unread count retrieved')
  );
});

/**
 * @desc    Mark notification as read
 * @route   PUT /api/v1/notifications/:id/read
 * @access  Private
 */
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  // Check ownership
  if (notification.recipient.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorized to update this notification');
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  res.json(
    new ApiResponse(200, { notification }, 'Notification marked as read')
  );
});

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/v1/notifications/read-all
 * @access  Private
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    {
      recipient: req.user._id,
      isRead: false,
    },
    {
      isRead: true,
      readAt: new Date(),
    }
  );

  res.json(
    new ApiResponse(200, {
      markedAsRead: result.modifiedCount,
    }, 'All notifications marked as read')
  );
});

/**
 * @desc    Mark multiple notifications as read
 * @route   PUT /api/v1/notifications/read-multiple
 * @access  Private
 */
const markMultipleAsRead = asyncHandler(async (req, res) => {
  const { notificationIds } = req.body;

  if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
    throw new ApiError(400, 'notificationIds array is required');
  }

  const result = await Notification.updateMany(
    {
      _id: { $in: notificationIds },
      recipient: req.user._id,
      isRead: false,
    },
    {
      isRead: true,
      readAt: new Date(),
    }
  );

  res.json(
    new ApiResponse(200, {
      markedAsRead: result.modifiedCount,
    }, 'Notifications marked as read')
  );
});

/**
 * @desc    Delete notification
 * @route   DELETE /api/v1/notifications/:id
 * @access  Private
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  // Check ownership
  if (notification.recipient.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorized to delete this notification');
  }

  await notification.deleteOne();

  res.json(
    new ApiResponse(200, null, 'Notification deleted successfully')
  );
});

/**
 * @desc    Delete all notifications
 * @route   DELETE /api/v1/notifications
 * @access  Private
 */
const deleteAllNotifications = asyncHandler(async (req, res) => {
  const { onlyRead } = req.query;

  const filter = { recipient: req.user._id };

  if (onlyRead === 'true') {
    filter.isRead = true;
  }

  const result = await Notification.deleteMany(filter);

  res.json(
    new ApiResponse(200, {
      deleted: result.deletedCount,
    }, 'Notifications deleted successfully')
  );
});

/**
 * @desc    Get notifications by type
 * @route   GET /api/v1/notifications/type/:type
 * @access  Private
 */
const getNotificationsByType = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const validTypes = [
    'team_invite',
    'team_join_request',
    'team_accepted',
    'team_rejected',
    'teammate_interest',
    'message',
    'hackathon_reminder',
    'resource_comment',
    'general',
  ];

  if (!validTypes.includes(type)) {
    throw new ApiError(400, `Invalid type. Must be one of: ${validTypes.join(', ')}`);
  }

  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find({
      recipient: req.user._id,
      type,
    })
      .populate('sender', 'firstName lastName profilePicture')
      .populate('relatedTeam', 'name')
      .populate('relatedHackathon', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Notification.countDocuments({
      recipient: req.user._id,
      type,
    }),
  ]);

  res.json(
    new ApiResponse(200, {
      notifications,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    }, 'Notifications retrieved successfully')
  );
});

/**
 * @desc    Get recent notifications
 * @route   GET /api/v1/notifications/recent
 * @access  Private
 */
const getRecentNotifications = asyncHandler(async (req, res) => {
  const { limit = 5 } = req.query;

  const notifications = await Notification.find({
    recipient: req.user._id,
  })
    .populate('sender', 'firstName lastName profilePicture')
    .populate('relatedTeam', 'name')
    .populate('relatedHackathon', 'name')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  const unreadCount = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false,
  });

  res.json(
    new ApiResponse(200, {
      notifications,
      unreadCount,
    }, 'Recent notifications retrieved')
  );
});

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  markMultipleAsRead,
  deleteNotification,
  deleteAllNotifications,
  getNotificationsByType,
  getRecentNotifications,
};
