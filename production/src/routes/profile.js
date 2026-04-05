const express = require("express");
const { asyncHandler } = require("../middleware/errorHandler");
const { authMiddleware } = require("../middleware/auth");
// const { hackathonMiddleware } = require("../middleware/hackathon");
const { schemas } = require("../utils/profileValidation");
const { validateRequest } = require("../utils/validateRequest");
const ProfileController = require("../controllers/profileController");
const router = express.Router();


// Get current user's profile
router.get(
  "/me",
  authMiddleware,
  validateRequest(schemas.getMyProfile),
  asyncHandler(ProfileController.getMyProfile)
);

router.get(
    "/stats",
    authMiddleware,
    validateRequest(schemas.getProfileStats),
    asyncHandler(ProfileController.getProfileStats)
);

// Update current user's profile
router.put(
  "/me",
  authMiddleware,
  validateRequest(schemas.updateProfile),
  asyncHandler(ProfileController.updateMyProfile)
);


module.exports = router;