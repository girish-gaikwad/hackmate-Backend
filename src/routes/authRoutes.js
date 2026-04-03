const express = require('express');
const router = express.Router();
const { authController } = require('../controllers');
const { validate } = require('../middleware/validateMiddleware');
const { authValidation } = require('../validations');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter, strictLimiter } = require('../middleware/rateLimitMiddleware');


router.post(
  '/register',
  authLimiter,
  validate(authValidation.register),
  authController.register
);


router.post(
  '/login',
  authLimiter,
  validate(authValidation.login),
  authController.login
);


router.get(
  '/verify-email/:token',
  authController.verifyEmail
);


router.post(
  '/resend-verification',
  strictLimiter,
  validate(authValidation.resendVerification),
  authController.resendVerification
);


router.post(
  '/forgot-password',
  strictLimiter,
  validate(authValidation.forgotPassword),
  authController.forgotPassword
);


router.post(
  '/reset-password/:token',
  strictLimiter,
  validate(authValidation.resetPassword),
  authController.resetPassword
);


router.post(
  '/refresh-token',
  validate(authValidation.refreshToken),
  authController.refreshToken
);


router.post(
  '/logout',
  protect,
  authController.logout
);


router.get(
  '/me',
  protect,
  authController.getMe
);


router.put(
  '/change-password',
  protect,
  validate(authValidation.changePassword),
  authController.changePassword
);

module.exports = router;
