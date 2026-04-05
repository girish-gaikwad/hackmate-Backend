const Message = require("../models/Message");
const Team = require("../models/Team");
const User = require("../models/User");
const { sendSuccess, sendError } = require("../utils/response");

class ChatController {
  static async sendMessage(req, res) {
    try {
      const { teamId } = req.params;
      const { text } = req.body;
      const userId = req.user.userId;

      // Verify team exists
      const team = await Team.findById(teamId);
      if (!team) {
        return sendError(res, 404, "Team not found");
      }

      // Verify user is member of team
      const isMember = team.members.includes(userId) || team.leader.equals(userId);
      if (!isMember) {
        return sendError(res, 403, "You are not a member of this team");
      }

      // Get user details for senderName
      const user = await User.findById(userId);
      if (!user) {
        return sendError(res, 404, "User not found");
      }

      // Create message
      const message = await Message.create({
        team: teamId,
        sender: userId,
        senderName: user.name || user.email.split("@")[0],
        text,
      });

      return sendSuccess(res, 201, message, "Message sent successfully");
    } catch (error) {
      console.error("Send message error:", error);
      return sendError(res, 500, "Failed to send message");
    }
  }

  static async getMessages(req, res) {
    try {
      const { teamId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      // Verify team exists
      const team = await Team.findById(teamId);
      if (!team) {
        return sendError(res, 404, "Team not found");
      }

      // Verify user is member of team (optional - can be public read)
      const userId = req.user?.userId;
      if (userId) {
        const isMember = team.members.includes(userId) || team.leader.equals(userId);
        if (!isMember) {
          return sendError(res, 403, "You are not a member of this team");
        }
      }

      // Fetch messages - most recent first
      const messages = await Message.find({ team: teamId })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .lean();

      // Reverse to get chronological order (oldest first)
      messages.reverse();

      // Get total count for pagination
      const total = await Message.countDocuments({ team: teamId });

      return sendSuccess(
        res,
        200,
        {
          messages,
          pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: parseInt(offset) + parseInt(limit) < total,
          },
        },
        "Messages retrieved successfully"
      );
    } catch (error) {
      console.error("Get messages error:", error);
      return sendError(res, 500, "Failed to retrieve messages");
    }
  }

  static async deleteMessage(req, res) {
    try {
      const { teamId, messageId } = req.params;
      const userId = req.user.userId;

      const message = await Message.findById(messageId);
      if (!message) {
        return sendError(res, 404, "Message not found");
      }

      // Verify message belongs to this team
      if (!message.team.equals(teamId)) {
        return sendError(res, 400, "Message does not belong to this team");
      }

      // Verify user is message sender
      if (!message.sender.equals(userId)) {
        return sendError(res, 403, "You can only delete your own messages");
      }

      await Message.findByIdAndDelete(messageId);

      return sendSuccess(res, 200, { messageId }, "Message deleted successfully");
    } catch (error) {
      console.error("Delete message error:", error);
      return sendError(res, 500, "Failed to delete message");
    }
  }

  static async getRecentMessages(req, res) {
    try {
      const { teamId } = req.params;
      const { since } = req.query; // ISO timestamp to get only newer messages
      const userId = req.user?.userId;

      // Verify team exists
      const team = await Team.findById(teamId);
      if (!team) {
        return sendError(res, 404, "Team not found");
      }

      // Verify user is member
      if (userId) {
        const isMember = team.members.includes(userId) || team.leader.equals(userId);
        if (!isMember) {
          return sendError(res, 403, "You are not a member of this team");
        }
      }

      let query = { team: teamId };
      if (since) {
        query.createdAt = { $gt: new Date(since) };
      }

      const messages = await Message.find(query)
        .sort({ createdAt: 1 })
        .lean();

      return sendSuccess(res, 200, { messages }, "Recent messages retrieved");
    } catch (error) {
      console.error("Get recent messages error:", error);
      return sendError(res, 500, "Failed to retrieve recent messages");
    }
  }
}

module.exports = ChatController;
