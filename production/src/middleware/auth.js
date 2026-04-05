const JWTService = require("../services/jwtService");
const messages = require("../constants/messages");
const { sendError } = require("../utils/response");

// JWT verification middleware
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTService.extractTokenFromHeader(authHeader);

    if (!token) {
      return sendError(
        res,
        messages.ERROR.UNAUTHORIZED,
        messages.STATUS_CODES.UNAUTHORIZED
      );
    }

    const decoded = JWTService.verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return sendError(
      res,
      error.message || messages.ERROR.INVALID_TOKEN,
      messages.STATUS_CODES.UNAUTHORIZED
    );
  }
};

// Optional auth middleware (doesn't fail if no token)
const optionalAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTService.extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = JWTService.verifyAccessToken(token);
      req.user = decoded;
    }
  } catch (error) {
    // Silently ignore token errors
  }

  next();
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
};
