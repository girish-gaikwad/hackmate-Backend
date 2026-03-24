const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Receiver ID is required'],
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    messageType: {
      type: String,
      enum: ['text', 'file', 'hackathon-link'],
      default: 'text',
    },
    fileUrl: {
      type: String,
      default: '',
    },
    hackathonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hackathon',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, isRead: 1 });

// Static method to generate conversation ID from two user IDs
messageSchema.statics.generateConversationId = function (userId1, userId2) {
  // Sort IDs to ensure consistent conversation ID regardless of who sends first
  const sortedIds = [userId1.toString(), userId2.toString()].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
};

// Static method to get conversation messages
messageSchema.statics.getConversation = function (userId1, userId2, options = {}) {
  const { page = 1, limit = 50 } = options;
  const conversationId = this.generateConversationId(userId1, userId2);

  return this.find({ conversationId })
    .populate('senderId', 'firstName lastName profilePicture')
    .populate('receiverId', 'firstName lastName profilePicture')
    .populate('hackathonId', 'name slug')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

// Static method to get user's conversations
messageSchema.statics.getUserConversations = async function (userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const conversations = await this.aggregate([
    {
      $match: {
        $or: [{ senderId: userObjectId }, { receiverId: userObjectId }],
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $group: {
        _id: '$conversationId',
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$receiverId', userObjectId] }, { $eq: ['$isRead', false] }] },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        let: {
          senderId: '$lastMessage.senderId',
          receiverId: '$lastMessage.receiverId',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $or: [
                      { $eq: ['$_id', '$$senderId'] },
                      { $eq: ['$_id', '$$receiverId'] },
                    ],
                  },
                  { $ne: ['$_id', userObjectId] },
                ],
              },
            },
          },
          {
            $project: {
              _id: 1,
              firstName: 1,
              lastName: 1,
              profilePicture: 1,
            },
          },
        ],
        as: 'otherUser',
      },
    },
    { $unwind: '$otherUser' },
    {
      $project: {
        _id: 1,
        lastMessage: {
          _id: '$lastMessage._id',
          content: '$lastMessage.content',
          messageType: '$lastMessage.messageType',
          createdAt: '$lastMessage.createdAt',
          isRead: '$lastMessage.isRead',
          senderId: '$lastMessage.senderId',
        },
        unreadCount: 1,
        otherUser: 1,
      },
    },
    { $sort: { 'lastMessage.createdAt': -1 } },
  ]);

  return conversations;
};

// Static method to mark messages as read
messageSchema.statics.markAsRead = async function (conversationId, receiverId) {
  return this.updateMany(
    {
      conversationId,
      receiverId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );
};

// Static method to get unread count for a user
messageSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({
    receiverId: userId,
    isRead: false,
  });
};

// Pre-save middleware to set conversation ID
messageSchema.pre('save', function (next) {
  if (!this.conversationId) {
    this.conversationId = this.constructor.generateConversationId(
      this.senderId,
      this.receiverId
    );
  }
  next();
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
