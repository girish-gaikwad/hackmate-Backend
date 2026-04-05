const express = require("express");
const { asyncHandler } = require("../middleware/errorHandler");
const { authMiddleware } = require("../middleware/auth");
const { validateRequest } = require("../utils/validateRequest");
const { schemas } = require("../utils/hackathonValidation");
const HackathonController = require("../controllers/hackathonController");

const router = express.Router();

router.get("/", asyncHandler(HackathonController.getMergedHackathons));

router.get(
	"/bookmarks",
	authMiddleware,
	asyncHandler(HackathonController.listBookmarkedHackathons)
);

router.post(
	"/bookmarks",
	authMiddleware,
	validateRequest(schemas.addBookmark),
	asyncHandler(HackathonController.addBookmark)
);

router.delete(
	"/bookmarks",
	authMiddleware,
	validateRequest(schemas.removeBookmark),
	asyncHandler(HackathonController.removeBookmark)
);

module.exports = router;
