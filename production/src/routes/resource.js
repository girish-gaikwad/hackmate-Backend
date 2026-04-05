const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const { validateRequest } = require("../utils/validateRequest");
const { schemas } = require("../utils/resourceValidation");
const ResourceController = require("../controllers/resourceController");

const router = express.Router();

router.get("/", asyncHandler(ResourceController.listResources));
router.get("/:resourceId", asyncHandler(ResourceController.getResourceById));

router.post(
  "/",
  authMiddleware,
  validateRequest(schemas.createResource),
  asyncHandler(ResourceController.createResource)
);

router.patch(
  "/:resourceId",
  authMiddleware,
  validateRequest(schemas.updateResource),
  asyncHandler(ResourceController.updateResource)
);

router.post(
  "/:resourceId/likes",
  authMiddleware,
  asyncHandler(ResourceController.toggleLike)
);

router.post(
  "/:resourceId/comments",
  authMiddleware,
  validateRequest(schemas.addComment),
  asyncHandler(ResourceController.addComment)
);

module.exports = router;
