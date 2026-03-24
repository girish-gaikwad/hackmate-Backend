const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      index: true,
    },
    entityType: {
      type: String,
      enum: [
        'hackathon',
        'teammate-request',
        'team',
        'resource',
        'bookmark',
        'message',
        'user',
        'auth',
      ],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// Indexes
activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });

// Static method to log activity
activityLogSchema.statics.log = async function (data) {
  try {
    const log = await this.create({
      userId: data.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      metadata: data.metadata || {},
      ipAddress: data.ipAddress || '',
      userAgent: data.userAgent || '',
      timestamp: new Date(),
    });
    return log;
  } catch (error) {
    // Log error but don't throw - activity logging should not affect main operations
    console.error('Activity logging error:', error);
    return null;
  }
};

// Static method to get user's activity
activityLogSchema.statics.getUserActivity = function (userId, options = {}) {
  const { page = 1, limit = 50, action } = options;
  const query = { userId };

  if (action) {
    query.action = action;
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

// Static method to get activity stats
activityLogSchema.statics.getStats = async function (options = {}) {
  const { startDate, endDate } = options;
  const matchStage = {};

  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = new Date(startDate);
    if (endDate) matchStage.timestamp.$lte = new Date(endDate);
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const uniqueUsers = await this.distinct('userId', matchStage);

  return {
    actionStats: stats,
    uniqueUsers: uniqueUsers.length,
  };
};

// Static method to get daily active users
activityLogSchema.statics.getDailyActiveUsers = async function (days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await this.aggregate([
    { $match: { timestamp: { $gte: startDate } } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
        },
        uniqueUsers: { $addToSet: '$userId' },
      },
    },
    {
      $project: {
        _id: 1,
        date: '$_id',
        activeUsers: { $size: '$uniqueUsers' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return result;
};

// Static method to clean old logs (older than specified days)
activityLogSchema.statics.cleanOldLogs = async function (days = 90) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);

  return this.deleteMany({ timestamp: { $lt: dateThreshold } });
};

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;
