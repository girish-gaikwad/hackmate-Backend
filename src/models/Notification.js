const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: [
        'hackathon-deadline',
        'teammate-interest',
        'team-invite',
        'message',
        'resource-comment',
        'system',
      ],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    relatedModel: {
      type: String,
      enum: ['Hackathon', 'TeammateRequest', 'Team', 'Message', 'Resource', 'User'],
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    actionUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// Static method to create notification
notificationSchema.statics.createNotification = async function (data) {
  const notification = await this.create(data);
  return notification;
};

// Static method to get user's notifications
notificationSchema.statics.getUserNotifications = function (userId, options = {}) {
  const { page = 1, limit = 20, isRead } = options;
  const query = { userId };

  if (typeof isRead === 'boolean') {
    query.isRead = isRead;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

// Static method to mark notification as read
notificationSchema.statics.markAsRead = async function (notificationId, userId) {
  return this.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true },
    { new: true }
  );
};

// Static method to mark all notifications as read
notificationSchema.statics.markAllAsRead = async function (userId) {
  return this.updateMany(
    { userId, isRead: false },
    { isRead: true }
  );
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({ userId, isRead: false });
};

// Static method to delete old notifications (older than 30 days)
notificationSchema.statics.deleteOldNotifications = async function (days = 30) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);

  return this.deleteMany({
    isRead: true,
    createdAt: { $lt: dateThreshold },
  });
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
