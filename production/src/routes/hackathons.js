const express = require("express");
const { asyncHandler } = require("../middleware/errorHandler");
const HackathonController = require("../controllers/hackathonController");

const router = express.Router();

router.get("/", asyncHandler(HackathonController.getMergedHackathons));

module.exports = router;
