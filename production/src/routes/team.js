const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const TeamController = require("../controllers/teamController");
const ChatController = require("../controllers/chatController");
const { validateRequest } = require("../utils/validateRequest");
const { schemas } = require("../utils/teamValidation");
const { sendMessageSchema } = require("../utils/chatValidation");

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  validateRequest(schemas.createTeam),
  asyncHandler(TeamController.createTeam)
);

router.get("/discover", authMiddleware, asyncHandler(TeamController.discoverTeams));

router.get("/:teamId", authMiddleware, asyncHandler(TeamController.getTeamById));

router.patch(
  "/:teamId",
  authMiddleware,
  validateRequest(schemas.updateTeam),
  asyncHandler(TeamController.updateTeam)
);

router.delete("/:teamId", authMiddleware, asyncHandler(TeamController.deleteTeam));

router.delete(
  "/:teamId/members/:memberId",
  authMiddleware,
  asyncHandler(TeamController.removeMember)
);

router.post(
  "/:teamId/requests",
  authMiddleware,
  validateRequest(schemas.sendJoinRequest),
  asyncHandler(TeamController.requestToJoinTeam)
);

router.get(
  "/:teamId/requests",
  authMiddleware,
  asyncHandler(TeamController.getTeamRequests)
);

router.patch(
  "/requests/:requestId",
  authMiddleware,
  validateRequest(schemas.respondJoinRequest),
  asyncHandler(TeamController.respondToJoinRequest)
);

// Chat routes - polling based
router.post(
  "/:teamId/chat",
  authMiddleware,
  validateRequest(sendMessageSchema, "body"),
  asyncHandler(ChatController.sendMessage)
);

router.get(
  "/:teamId/chat",
  authMiddleware,
  asyncHandler(ChatController.getMessages)
);

router.get(
  "/:teamId/chat/recent",
  authMiddleware,
  asyncHandler(ChatController.getRecentMessages)
);

router.delete(
  "/:teamId/chat/:messageId",
  authMiddleware,
  asyncHandler(ChatController.deleteMessage)
);

module.exports = router;
