const isProfileComplete = require("../utils/isProfileComplete");
const { sendError } = require("../utils/response");
const messages = require("../constants/messages");

// Middleware to check if user profile is complete
const hackathonMiddleware = (req, res, next) => {
  try {
    if (!req.user) {
      return sendError(
        res,
        messages.ERROR.UNAUTHORIZED,
        messages.STATUS_CODES.UNAUTHORIZED
      );
    }

    if (!isProfileComplete(req.user)) {
      return sendError(
        res,
        messages.ERROR.INCOMPLETE_PROFILE,
        messages.STATUS_CODES.BAD_REQUEST
      );
    }

    next();
  } catch (error) {
    return sendError(
      res,
      error.message || messages.ERROR.SERVER_ERROR,
      messages.STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
};