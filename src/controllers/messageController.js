const Message = require('../models/Message');
const User = require('../models/User');
const Team = require('../models/Team');
const { ApiError, ApiResponse, asyncHandler } = require('../utils');
const { NotificationService, FileUploadService, AnalyticsService } = require('../services');

/**
 * @desc    Get conversations list
 * @route   GET /api/v1/messages/conversations
 * @access  Private
 */
const getConversations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  // Get unique conversations for the user
  const conversations = await Message.aggregate([
    {
      $match: {
        $or: [
          { sender: req.user._id },
          { recipient: req.user._id },
        ],
        isActive: true,
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
              {
                $and: [
                  { $eq: ['$recipient', req.user._id] },
                  { $eq: ['$isRead', false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $sort: { 'lastMessage.createdAt': -1 },
    },
    {
      $skip: skip,
    },
    {
      $limit: parseInt(limit),
    },
  ]);

  // Populate user/team info
  const populatedConversations = await Promise.all(
    conversations.map(async (conv) => {
      const lastMsg = conv.lastMessage;
      let otherParty = null;
      let teamInfo = null;

      if (lastMsg.messageType === 'direct') {
        const otherUserId = lastMsg.sender.toString() === req.user._id.toString()
          ? lastMsg.recipient
          : lastMsg.sender;
        otherParty = await User.findById(otherUserId).select('firstName lastName profilePicture');
      } else if (lastMsg.messageType === 'team') {
        teamInfo = await Team.findById(lastMsg.team).select('name');
      }

      return {
        conversationId: conv._id,
        lastMessage: {
          _id: lastMsg._id,
          content: lastMsg.content,
          createdAt: lastMsg.createdAt,
          sender: lastMsg.sender,
          messageType: lastMsg.messageType,
        },
        unreadCount: conv.unreadCount,
        otherParty,
        team: teamInfo,
      };
    })
  );

  const total = await Message.aggregate([
    {
      $match: {
        $or: [
          { sender: req.user._id },
          { recipient: req.user._id },
        ],
        isActive: true,
      },
    },
    {
      $group: {
        _id: '$conversationId',
      },
    },
    {
      $count: 'total',
    },
  ]);

  res.json(
    new ApiResponse(200, {
      conversations: populatedConversations,
      pagination: {
        total: total[0]?.total || 0,
        page: parseInt(page),
        pages: Math.ceil((total[0]?.total || 0) / limit),
        hasMore: page * limit < (total[0]?.total || 0),
      },
    }, 'Conversations retrieved successfully')
  );
});

/**
 * @desc    Get messages in a conversation
 * @route   GET /api/v1/messages/conversation/:conversationId
 * @access  Private
 */
const getConversationMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { page = 1, limit = 50, before } = req.query;

  const filter = {
    conversationId,
    isActive: true,
    $or: [
      { sender: req.user._id },
      { recipient: req.user._id },
    ],
  };

  // For cursor-based pagination
  if (before) {
    filter.createdAt = { $lt: new Date(before) };
  }

  const messages = await Message.find(filter)
    .populate('sender', 'firstName lastName profilePicture')
    .populate('recipient', 'firstName lastName profilePicture')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  // Mark messages as read
  await Message.updateMany(
    {
      conversationId,
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
      messages: messages.reverse(), // Return in chronological order
      hasMore: messages.length === parseInt(limit),
    }, 'Messages retrieved successfully')
  );
});

/**
 * @desc    Get direct messages with a user
 * @route   GET /api/v1/messages/user/:userId
 * @access  Private
 */
const getDirectMessages = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 50, before } = req.query;

  // Check if user exists
  const otherUser = await User.findById(userId);
  if (!otherUser) {
    throw new ApiError(404, 'User not found');
  }

  // Generate conversation ID
  const conversationId = Message.generateConversationId(req.user._id, userId);

  const filter = {
    conversationId,
    messageType: 'direct',
    isActive: true,
  };

  if (before) {
    filter.createdAt = { $lt: new Date(before) };
  }

  const messages = await Message.find(filter)
    .populate('sender', 'firstName lastName profilePicture')
    .populate('recipient', 'firstName lastName profilePicture')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  // Mark as read
  await Message.updateMany(
    {
      conversationId,
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
      messages: messages.reverse(),
      otherUser: {
        _id: otherUser._id,
        firstName: otherUser.firstName,
        lastName: otherUser.lastName,
        profilePicture: otherUser.profilePicture,
      },
      hasMore: messages.length === parseInt(limit),
    }, 'Messages retrieved successfully')
  );
});

/**
 * @desc    Get team messages
 * @route   GET /api/v1/messages/team/:teamId
 * @access  Private
 */
const getTeamMessages = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { page = 1, limit = 50, before } = req.query;

  // Check if team exists and user is a member
  const team = await Team.findById(teamId);
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  const isMember = team.members.some((m) => m.user.toString() === req.user._id.toString());
  if (!isMember) {
    throw new ApiError(403, 'You are not a member of this team');
  }

  const filter = {
    team: teamId,
    messageType: 'team',
    isActive: true,
  };

  if (before) {
    filter.createdAt = { $lt: new Date(before) };
  }

  const messages = await Message.find(filter)
    .populate('sender', 'firstName lastName profilePicture')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  // Mark as read
  await Message.updateMany(
    {
      team: teamId,
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
      messages: messages.reverse(),
      team: {
        _id: team._id,
        name: team.name,
        members: team.members,
      },
      hasMore: messages.length === parseInt(limit),
    }, 'Team messages retrieved successfully')
  );
});

/**
 * @desc    Send direct message
 * @route   POST /api/v1/messages/user/:userId
 * @access  Private
 */
const sendDirectMessage = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { content } = req.body;

  // Can't message yourself
  if (userId === req.user._id.toString()) {
    throw new ApiError(400, 'Cannot send message to yourself');
  }

  // Check if recipient exists
  const recipient = await User.findById(userId);
  if (!recipient) {
    throw new ApiError(404, 'User not found');
  }

  const messageData = {
    sender: req.user._id,
    recipient: userId,
    content,
    messageType: 'direct',
    conversationId: Message.generateConversationId(req.user._id, userId),
  };

  // Handle file attachment if present
  if (req.file) {
    const uploadResult = await FileUploadService.uploadMessageAttachment(
      req.file,
      req.user._id
    );
    messageData.attachment = {
      url: uploadResult.url,
      type: req.file.mimetype,
      name: req.file.originalname,
      size: req.file.size,
    };
  }

  const message = await Message.create(messageData);
  await message.populate('sender', 'firstName lastName profilePicture');
  await message.populate('recipient', 'firstName lastName profilePicture');

  // Create notification
  await NotificationService.createMessageNotification(
    userId,
    req.user._id,
    content.substring(0, 100)
  );

  // Log activity
  await AnalyticsService.logActivity({
    user: req.user._id,
    action: 'message',
    entityType: 'message',
    entityId: message._id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Emit socket event if socket.io is set up
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${userId}`).emit('new_message', message);
  }

  res.status(201).json(
    new ApiResponse(201, { message }, 'Message sent successfully')
  );
});

/**
 * @desc    Send team message
 * @route   POST /api/v1/messages/team/:teamId
 * @access  Private
 */
const sendTeamMessage = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { content } = req.body;

  // Check if team exists and user is a member
  const team = await Team.findById(teamId);
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  const isMember = team.members.some((m) => m.user.toString() === req.user._id.toString());
  if (!isMember) {
    throw new ApiError(403, 'You are not a member of this team');
  }

  const messageData = {
    sender: req.user._id,
    team: teamId,
    content,
    messageType: 'team',
    conversationId: `team_${teamId}`,
  };

  // Handle file attachment if present
  if (req.file) {
    const uploadResult = await FileUploadService.uploadMessageAttachment(
      req.file,
      req.user._id
    );
    messageData.attachment = {
      url: uploadResult.url,
      type: req.file.mimetype,
      name: req.file.originalname,
      size: req.file.size,
    };
  }

  const message = await Message.create(messageData);
  await message.populate('sender', 'firstName lastName profilePicture');

  // Emit socket event to team room
  const io = req.app.get('io');
  if (io) {
    io.to(`team_${teamId}`).emit('new_team_message', message);
  }

  // Create notifications for other team members
  for (const member of team.members) {
    if (member.user.toString() !== req.user._id.toString()) {
      await NotificationService.createTeamMessageNotification(
        member.user,
        req.user._id,
        teamId,
        team.name
      );
    }
  }

  res.status(201).json(
    new ApiResponse(201, { message }, 'Team message sent successfully')
  );
});

/**
 * @desc    Mark messages as read
 * @route   PUT /api/v1/messages/read
 * @access  Private
 */
const markAsRead = asyncHandler(async (req, res) => {
  const { messageIds, conversationId } = req.body;

  const filter = {
    recipient: req.user._id,
    isRead: false,
  };

  if (messageIds && messageIds.length > 0) {
    filter._id = { $in: messageIds };
  } else if (conversationId) {
    filter.conversationId = conversationId;
  } else {
    throw new ApiError(400, 'Either messageIds or conversationId is required');
  }

  const result = await Message.updateMany(filter, {
    isRead: true,
    readAt: new Date(),
  });

  res.json(
    new ApiResponse(200, { 
      markedAsRead: result.modifiedCount 
    }, 'Messages marked as read')
  );
});

/**
 * @desc    Delete message
 * @route   DELETE /api/v1/messages/:id
 * @access  Private
 */
const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);

  if (!message) {
    throw new ApiError(404, 'Message not found');
  }

  // Only sender can delete their own message
  if (message.sender.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorized to delete this message');
  }

  // Soft delete
  message.isActive = false;
  message.content = '[Message deleted]';
  await message.save();

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    if (message.messageType === 'direct') {
      io.to(`user_${message.recipient}`).emit('message_deleted', {
        messageId: message._id,
        conversationId: message.conversationId,
      });
    } else if (message.messageType === 'team') {
      io.to(`team_${message.team}`).emit('message_deleted', {
        messageId: message._id,
        conversationId: message.conversationId,
      });
    }
  }

  res.json(
    new ApiResponse(200, null, 'Message deleted successfully')
  );
});

/**
 * @desc    Get unread message count
 * @route   GET /api/v1/messages/unread-count
 * @access  Private
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Message.countDocuments({
    recipient: req.user._id,
    isRead: false,
    isActive: true,
  });

  res.json(
    new ApiResponse(200, { unreadCount: count }, 'Unread count retrieved')
  );
});

/**
 * @desc    Search messages
 * @route   GET /api/v1/messages/search
 * @access  Private
 */
const searchMessages = asyncHandler(async (req, res) => {
  const { query, conversationId, page = 1, limit = 20 } = req.query;

  if (!query || query.trim().length < 2) {
    throw new ApiError(400, 'Search query must be at least 2 characters');
  }

  const filter = {
    $or: [
      { sender: req.user._id },
      { recipient: req.user._id },
    ],
    content: { $regex: query, $options: 'i' },
    isActive: true,
  };

  if (conversationId) {
    filter.conversationId = conversationId;
  }

  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    Message.find(filter)
      .populate('sender', 'firstName lastName profilePicture')
      .populate('recipient', 'firstName lastName profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Message.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(200, {
      messages,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    }, 'Search results retrieved')
  );
});

module.exports = {
  getConversations,
  getConversationMessages,
  getDirectMessages,
  getTeamMessages,
  sendDirectMessage,
  sendTeamMessage,
  markAsRead,
  deleteMessage,
  getUnreadCount,
  searchMessages,
};
