const AuthService = require("../services/authService");
const { sendSuccess, sendError } = require("../utils/response");
const messages = require("../constants/messages");

class AuthController {
  // Send OTP for registration
  static async sendRegistrationOTP(req, res, next) {
    try {
      const result = await AuthService.sendRegistrationOTP(req.body.email);
      return sendSuccess(
        res,
        result,
        messages.SUCCESS.OTP_SENT,
        messages.STATUS_CODES.OK
      );
    } catch (error) {
      next(error);
    }
  }

  // Verify OTP and register user
  static async verifyRegistrationOTP(req, res, next) {
    try {
      const { email, otp, password } = req.body;
      const result = await AuthService.verifyRegistrationOTP(
        email,
        otp,
        password
      );
      return sendSuccess(
        res,
        result.data,
        result.message,
        messages.STATUS_CODES.CREATED
      );
    } catch (error) {
      next(error);
    }
  }

  // Login user
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      return sendSuccess(
        res,
        result.data,
        result.message,
        messages.STATUS_CODES.OK
      );
    } catch (error) {
      next(error);
    }
  }

  // Refresh access token
  static async refreshAccessToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refreshAccessToken(refreshToken);
      return sendSuccess(
        res,
        result.data,
        result.message,
        messages.STATUS_CODES.OK
      );
    } catch (error) {
      next(error);
    }
  }

  // Change password
  static async changePassword(req, res, next) {
    try {
      const userId = req.user.userId;
      const { oldPassword, newPassword } = req.body;
      const result = await AuthService.changePassword(
        userId,
        oldPassword,
        newPassword
      );
      return sendSuccess(
        res,
        null,
        result.message,
        messages.STATUS_CODES.OK
      );
    } catch (error) {
      next(error);
    }
  }

  // Send forgot password OTP
  static async sendForgotPasswordOTP(req, res, next) {
    try {
      const result = await AuthService.sendForgotPasswordOTP(req.body.email);
      return sendSuccess(
        res,
        result,
        messages.SUCCESS.OTP_SENT,
        messages.STATUS_CODES.OK
      );
    } catch (error) {
      next(error);
    }
  }

  // Verify forgot password OTP and reset password
  static async verifyForgotPasswordOTP(req, res, next) {
    try {
      const { email, otp, newPassword } = req.body;
      const result = await AuthService.verifyForgotPasswordOTP(
        email,
        otp,
        newPassword
      );
      return sendSuccess(
        res,
        null,
        result.message,
        messages.STATUS_CODES.OK
      );
    } catch (error) {
      next(error);
    }
  }

  // Logout
  static async logout(req, res, next) {
    try {
      const userId = req.user.userId;
      const { refreshToken } = req.body;
      const result = await AuthService.logout(userId, refreshToken);
      return sendSuccess(
        res,
        null,
        result.message,
        messages.STATUS_CODES.OK
      );
    } catch (error) {
      next(error);
    }
  }

  // Get current user
  static async getCurrentUser(req, res, next) {
    try {
      const userId = req.user.userId;
      const result = await AuthService.getUserById(userId);
      return sendSuccess(
        res,
        result.data,
        result.message,
        messages.STATUS_CODES.OK
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
