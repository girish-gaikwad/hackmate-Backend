const express = require("express");
const ChatController = require("../controllers/chatController");
const authMiddleware = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");
const { sendMessageSchema } = require("../utils/chatValidation");

const router = express.Router({ mergeParams: true });

// Send message to team chat
router.post(
  "/:teamId/chat",
  authMiddleware,
  validateRequest(sendMessageSchema, "body"),
  ChatController.sendMessage
);

// Get messages from team chat (polling endpoint)
// Query params: limit (default 50), offset (default 0)
// Optional: since (ISO timestamp) to get only new messages since timestamp
router.get("/:teamId/chat", authMiddleware, ChatController.getMessages);

// Get recent messages since timestamp (for efficient polling)
router.get("/:teamId/chat/recent", authMiddleware, ChatController.getRecentMessages);

// Delete a message (only sender can delete)
router.delete(
  "/:teamId/chat/:messageId",
  authMiddleware,
  ChatController.deleteMessage
);

module.exports = router;
