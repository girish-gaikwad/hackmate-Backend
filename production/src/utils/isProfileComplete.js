const messages = require("../constants/messages");

const profileCheck = (req, res, next) => {
  try {

    // Check if profile is complete
    const { isProfileComplete } = req.user;
    if (!isProfileComplete ) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        message: messages.ERROR.INCOMPLETE_PROFILE,
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      success: false,
      message: error.message || "Server error",
    });
  }
};