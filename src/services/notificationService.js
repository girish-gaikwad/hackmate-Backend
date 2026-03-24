const { Notification, User } = require('../models');
const EmailService = require('./emailService');
const logger = require('../utils/logger');

/**
 * Notification Service - Handles creating and managing notifications
 */
class NotificationService {
  /**
   * Create a notification
   * @param {Object} data - Notification data
   * @param {boolean} sendEmail - Whether to also send email notification
   */
  static async createNotification(data, sendEmail = false) {
    try {
      const notification = await Notification.create(data);

      // Send email if enabled and user has email notifications on
      if (sendEmail) {
        const user = await User.findById(data.userId);
        if (user && user.preferences.emailNotifications) {
          await EmailService.sendNotificationEmail(
            user.email,
            user.firstName,
            data.title,
            data.message,
            data.actionUrl
          );
        }
      }

      return notification;
    } catch (error) {
      logger.error(`Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create hackathon deadline notification
   * @param {Object} user - User object
   * @param {Object} hackathon - Hackathon object
   * @param {number} daysUntilStart - Days until hackathon starts
   */
  static async notifyHackathonDeadline(user, hackathon, daysUntilStart) {
    const data = {
      userId: user._id,
      type: 'hackathon-deadline',
      title: `${hackathon.name} starts ${daysUntilStart === 0 ? 'today' : `in ${daysUntilStart} day(s)`}!`,
      message: `Don't forget! The hackathon "${hackathon.name}" ${daysUntilStart === 0 ? 'starts today' : `is starting in ${daysUntilStart} day(s)`}. Make sure you're ready!`,
      relatedId: hackathon._id,
      relatedModel: 'Hackathon',
      actionUrl: `/hackathons/${hackathon.slug}`,
    };

    return this.createNotification(data, true);
  }

  /**
   * Create teammate interest notification
   * @param {Object} requestOwner - Owner of teammate request
   * @param {Object} interestedUser - User expressing interest
   * @param {Object} request - Teammate request
   */
  static async notifyTeammateInterest(requestOwner, interestedUser, request) {
    const data = {
      userId: requestOwner._id,
      type: 'teammate-interest',
      title: 'New Interest in Your Request',
      message: `${interestedUser.firstName} ${interestedUser.lastName} is interested in your teammate request "${request.title}"`,
      relatedId: request._id,
      relatedModel: 'TeammateRequest',
      actionUrl: `/teammate-requests/${request._id}`,
    };

    return this.createNotification(data, true);
  }

  /**
   * Create team invitation notification
   * @param {Object} invitee - User being invited
   * @param {Object} inviter - User sending invitation
   * @param {Object} team - Team object
   */
  static async notifyTeamInvitation(invitee, inviter, team) {
    const data = {
      userId: invitee._id,
      type: 'team-invite',
      title: 'Team Invitation',
      message: `${inviter.firstName} ${inviter.lastName} invited you to join team "${team.teamName}"`,
      relatedId: team._id,
      relatedModel: 'Team',
      actionUrl: `/teams/${team._id}`,
    };

    return this.createNotification(data, true);
  }

  /**
   * Create new message notification
   * @param {Object} receiver - Message receiver
   * @param {Object} sender - Message sender
   */
  static async notifyNewMessage(receiver, sender) {
    const data = {
      userId: receiver._id,
      type: 'message',
      title: 'New Message',
      message: `You have a new message from ${sender.firstName} ${sender.lastName}`,
      relatedId: sender._id,
      relatedModel: 'User',
      actionUrl: `/messages/${sender._id}`,
    };

    // Don't send email for every message - only in-app notification
    return this.createNotification(data, false);
  }

  /**
   * Create resource comment notification
   * @param {Object} resourceOwner - Owner of the resource
   * @param {Object} commenter - User who commented
   * @param {Object} resource - Resource object
   */
  static async notifyResourceComment(resourceOwner, commenter, resource) {
    const data = {
      userId: resourceOwner._id,
      type: 'resource-comment',
      title: 'New Comment on Your Resource',
      message: `${commenter.firstName} ${commenter.lastName} commented on your resource "${resource.title}"`,
      relatedId: resource._id,
      relatedModel: 'Resource',
      actionUrl: `/resources/${resource._id}`,
    };

    return this.createNotification(data, true);
  }

  /**
   * Create system notification
   * @param {string} userId - User ID
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} actionUrl - Optional action URL
   */
  static async notifySystem(userId, title, message, actionUrl = '') {
    const data = {
      userId,
      type: 'system',
      title,
      message,
      actionUrl,
    };

    return this.createNotification(data, false);
  }

  /**
   * Get user's notifications
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   */
  static async getUserNotifications(userId, options = {}) {
    return Notification.getUserNotifications(userId, options);
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   */
  static async markAsRead(notificationId, userId) {
    return Notification.markAsRead(notificationId, userId);
  }

  /**
   * Mark all notifications as read
   * @param {string} userId - User ID
   */
  static async markAllAsRead(userId) {
    return Notification.markAllAsRead(userId);
  }

  /**
   * Get unread count
   * @param {string} userId - User ID
   */
  static async getUnreadCount(userId) {
    return Notification.getUnreadCount(userId);
  }

  /**
   * Delete notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   */
  static async deleteNotification(notificationId, userId) {
    return Notification.findOneAndDelete({ _id: notificationId, userId });
  }

  /**
   * Send bulk notifications to multiple users
   * @param {Array} userIds - Array of user IDs
   * @param {Object} notificationData - Notification data (without userId)
   */
  static async sendBulkNotifications(userIds, notificationData) {
    const notifications = userIds.map(userId => ({
      ...notificationData,
      userId,
    }));

    try {
      return await Notification.insertMany(notifications);
    } catch (error) {
      logger.error(`Failed to send bulk notifications: ${error.message}`);
      throw error;
    }
  }
}

module.exports = NotificationService;
