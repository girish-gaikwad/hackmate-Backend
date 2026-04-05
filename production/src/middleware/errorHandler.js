const messages = require("../constants/messages");
const { sendError } = require("../utils/response");

// Global error handling middleware
const errorHandler = (error, req, res, next) => {
  console.error("Error:", error);

  // Custom error format
  if (error.message && error.statusCode) {
    return res.status(error.statusCode).json({
      statusCode: error.statusCode,
      success: false,
      message: error.message,
      data: error.data || null,
    });
  }

  // MongoDB validation error
  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors).map((err) => err.message);
    return res.status(400).json({
      statusCode: 400,
      success: false,
      message: "Validation error",
      errors: messages,
    });
  }

  // MongoDB duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return sendError(
      res,
      `${field} already exists`,
      messages.STATUS_CODES.CONFLICT
    );
  }

  // JWT errors
  if (error.name === "JsonWebTokenError") {
    return sendError(
      res,
      messages.ERROR.INVALID_TOKEN,
      messages.STATUS_CODES.UNAUTHORIZED
    );
  }

  if (error.name === "TokenExpiredError") {
    return sendError(
      res,
      messages.ERROR.TOKEN_EXPIRED,
      messages.STATUS_CODES.UNAUTHORIZED
    );
  }

  // Default error
  return sendError(
    res,
    messages.ERROR.INTERNAL_ERROR,
    messages.STATUS_CODES.INTERNAL_ERROR
  );
};

// Async wrapper to handle errors in async route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  asyncHandler,
};
