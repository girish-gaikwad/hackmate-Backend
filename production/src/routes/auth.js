const express = require("express");
const rateLimit = require("express-rate-limit");
const AuthController = require("../controllers/authController");
const { authMiddleware } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const { schemas } = require("../utils/authValidation");
const { validateRequest } = require("../utils/validateRequest");
const config = require("../config/env");

const router = express.Router();

// Rate limiting middleware for auth routes
const authLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: "Too many attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.post(
  "/register/send-otp",
  authLimiter,
  validateRequest(schemas.registerSendOtp),
  asyncHandler(AuthController.sendRegistrationOTP)
);

router.post(
  "/register/verify-otp",
  authLimiter,
  validateRequest(schemas.registerVerifyOtp),
  asyncHandler(AuthController.verifyRegistrationOTP)
);

router.post(
  "/login",
  authLimiter,
  validateRequest(schemas.login),
  asyncHandler(AuthController.login)
);

router.post(
  "/forgot-password/send-otp",
  authLimiter,
  validateRequest(schemas.forgotPasswordSendOtp),
  asyncHandler(AuthController.sendForgotPasswordOTP)
);

router.post(
  "/forgot-password/verify-otp",
  authLimiter,
  validateRequest(schemas.forgotPasswordVerifyOtp),
  asyncHandler(AuthController.verifyForgotPasswordOTP)
);

router.post(
  "/refresh-token",
  validateRequest(schemas.refreshToken),
  asyncHandler(AuthController.refreshAccessToken)
);

// Protected routes
router.get(
  "/me",
  authMiddleware,
  asyncHandler(AuthController.getCurrentUser)
);

router.post(
  "/change-password",
  authMiddleware,
  validateRequest(schemas.changePassword),
  asyncHandler(AuthController.changePassword)
);

router.post(
  "/logout",
  authMiddleware,
  asyncHandler(AuthController.logout)
);

module.exports = router;
