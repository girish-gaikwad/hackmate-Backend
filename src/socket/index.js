const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const { notificationService } = require('../services');
const logger = require('../utils/logger');

// Store connected users: userId -> Set of socketIds
const connectedUsers = new Map();

/**
 * Initialize Socket.io handlers
 * @param {Server} io - Socket.io server instance
 */
const initializeSocket = (io) => {
  // Authentication middleware for sockets
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id name email profilePicture');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error.message);
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    
    logger.info(`User connected: ${socket.user.name} (${userId})`);

    // Add user to connected users
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId).add(socket.id);

    // Join user's personal room for direct messages
    socket.join(`user:${userId}`);

    // Update user's online status
    User.findByIdAndUpdate(userId, { 
      lastActive: new Date(),
      isOnline: true 
    }).catch(err => logger.error('Error updating online status:', err));

    // Broadcast user online status to their contacts
    socket.broadcast.emit('user:online', { userId });

    // =====================
    // Direct Message Handlers
    // =====================

    /**
     * Send direct message
     * @event message:send
     * @param {Object} data - { recipientId, content, attachment? }
     */
    socket.on('message:send', async (data, callback) => {
      try {
        const { recipientId, content, attachment } = data;

        if (!recipientId || (!content && !attachment)) {
          return callback?.({ error: 'Recipient and content/attachment required' });
        }

        // Create message
        const message = await Message.create({
          sender: userId,
          recipient: recipientId,
          content,
          attachment,
          conversationType: 'direct'
        });

        // Populate sender info
        await message.populate('sender', 'name profilePicture');

        // Send to recipient if online
        io.to(`user:${recipientId}`).emit('message:receive', {
          message,
          conversationType: 'direct'
        });

        // Send notification if recipient is not in the same conversation
        await notificationService.createMessageNotification(
          recipientId,
          userId,
          message._id
        );

        callback?.({ success: true, message });
      } catch (error) {
        logger.error('Error sending message:', error);
        callback?.({ error: 'Failed to send message' });
      }
    });

    /**
     * Mark message as read
     * @event message:read
     * @param {Object} data - { messageId }
     */
    socket.on('message:read', async (data, callback) => {
      try {
        const { messageId } = data;

        const message = await Message.findOneAndUpdate(
          { _id: messageId, recipient: userId, isRead: false },
          { isRead: true, readAt: new Date() },
          { new: true }
        );

        if (message) {
          // Notify sender that message was read
          io.to(`user:${message.sender}`).emit('message:read:ack', {
            messageId,
            readAt: message.readAt
          });
        }

        callback?.({ success: true });
      } catch (error) {
        logger.error('Error marking message as read:', error);
        callback?.({ error: 'Failed to mark as read' });
      }
    });

    /**
     * User is typing indicator
     * @event typing:start
     * @param {Object} data - { recipientId, conversationType, teamId? }
     */
    socket.on('typing:start', (data) => {
      const { recipientId, conversationType, teamId } = data;

      if (conversationType === 'direct' && recipientId) {
        io.to(`user:${recipientId}`).emit('typing:indicator', {
          userId,
          userName: socket.user.name,
          conversationType: 'direct',
          isTyping: true
        });
      } else if (conversationType === 'team' && teamId) {
        socket.to(`team:${teamId}`).emit('typing:indicator', {
          userId,
          userName: socket.user.name,
          conversationType: 'team',
          teamId,
          isTyping: true
        });
      }
    });

    /**
     * User stopped typing
     * @event typing:stop
     */
    socket.on('typing:stop', (data) => {
      const { recipientId, conversationType, teamId } = data;

      if (conversationType === 'direct' && recipientId) {
        io.to(`user:${recipientId}`).emit('typing:indicator', {
          userId,
          isTyping: false
        });
      } else if (conversationType === 'team' && teamId) {
        socket.to(`team:${teamId}`).emit('typing:indicator', {
          userId,
          teamId,
          isTyping: false
        });
      }
    });

    // =====================
    // Team Room Handlers
    // =====================

    /**
     * Join team room
     * @event team:join
     * @param {Object} data - { teamId }
     */
    socket.on('team:join', async (data, callback) => {
      try {
        const { teamId } = data;

        // Verify user is a member of the team
        const Team = require('../models/Team');
        const team = await Team.findOne({
          _id: teamId,
          'members.user': userId
        });

        if (!team) {
          return callback?.({ error: 'Not a team member' });
        }

        socket.join(`team:${teamId}`);
        logger.info(`User ${userId} joined team room: ${teamId}`);

        // Notify team members
        socket.to(`team:${teamId}`).emit('team:member:online', {
          userId,
          userName: socket.user.name
        });

        callback?.({ success: true });
      } catch (error) {
        logger.error('Error joining team room:', error);
        callback?.({ error: 'Failed to join team room' });
      }
    });

    /**
     * Leave team room
     * @event team:leave
     */
    socket.on('team:leave', (data) => {
      const { teamId } = data;
      socket.leave(`team:${teamId}`);
      
      socket.to(`team:${teamId}`).emit('team:member:offline', {
        userId,
        userName: socket.user.name
      });
    });

    /**
     * Send team message
     * @event team:message:send
     * @param {Object} data - { teamId, content, attachment? }
     */
    socket.on('team:message:send', async (data, callback) => {
      try {
        const { teamId, content, attachment } = data;

        if (!teamId || (!content && !attachment)) {
          return callback?.({ error: 'Team ID and content/attachment required' });
        }

        // Verify user is a team member
        const Team = require('../models/Team');
        const team = await Team.findOne({
          _id: teamId,
          'members.user': userId
        });

        if (!team) {
          return callback?.({ error: 'Not a team member' });
        }

        // Create message
        const message = await Message.create({
          sender: userId,
          team: teamId,
          content,
          attachment,
          conversationType: 'team'
        });

        // Populate sender info
        await message.populate('sender', 'name profilePicture');

        // Send to all team members
        io.to(`team:${teamId}`).emit('team:message:receive', {
          message,
          teamId
        });

        // Create notifications for offline team members
        for (const member of team.members) {
          if (member.user.toString() !== userId && !connectedUsers.has(member.user.toString())) {
            await notificationService.createTeamMessageNotification(
              member.user,
              userId,
              teamId,
              message._id
            );
          }
        }

        callback?.({ success: true, message });
      } catch (error) {
        logger.error('Error sending team message:', error);
        callback?.({ error: 'Failed to send message' });
      }
    });

    // =====================
    // Notification Handlers
    // =====================

    /**
     * Subscribe to notifications
     * @event notifications:subscribe
     */
    socket.on('notifications:subscribe', () => {
      socket.join(`notifications:${userId}`);
    });

    // =====================
    // Presence Handlers
    // =====================

    /**
     * Get online users from a list
     * @event presence:check
     * @param {Object} data - { userIds: string[] }
     */
    socket.on('presence:check', (data, callback) => {
      const { userIds } = data;
      const onlineUsers = userIds.filter(id => connectedUsers.has(id));
      callback?.({ onlineUsers });
    });

    // =====================
    // Disconnect Handler
    // =====================

    socket.on('disconnect', async () => {
      logger.info(`User disconnected: ${socket.user.name} (${userId})`);

      // Remove socket from user's connections
      const userSockets = connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          connectedUsers.delete(userId);
          
          // Update user's offline status
          await User.findByIdAndUpdate(userId, { 
            lastActive: new Date(),
            isOnline: false 
          }).catch(err => logger.error('Error updating offline status:', err));

          // Broadcast user offline status
          socket.broadcast.emit('user:offline', { userId });
        }
      }
    });

    // =====================
    // Error Handler
    // =====================

    socket.on('error', (error) => {
      logger.error(`Socket error for user ${userId}:`, error);
    });
  });

  return io;
};

/**
 * Send notification to a user via socket
 * @param {Server} io - Socket.io instance
 * @param {string} userId - User ID
 * @param {Object} notification - Notification object
 */
const sendNotification = (io, userId, notification) => {
  io.to(`notifications:${userId}`).emit('notification:new', notification);
};

/**
 * Check if a user is online
 * @param {string} userId - User ID
 * @returns {boolean}
 */
const isUserOnline = (userId) => {
  return connectedUsers.has(userId);
};

/**
 * Get count of online users
 * @returns {number}
 */
const getOnlineUsersCount = () => {
  return connectedUsers.size;
};

/**
 * Get all online user IDs
 * @returns {string[]}
 */
const getOnlineUserIds = () => {
  return Array.from(connectedUsers.keys());
};

module.exports = {
  initializeSocket,
  sendNotification,
  isUserOnline,
  getOnlineUsersCount,
  getOnlineUserIds
};
