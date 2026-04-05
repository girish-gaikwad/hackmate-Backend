const User = require("../models/User");
const JWTService = require("./jwtService");
const EmailService = require("./emailService");
const messages = require("../constants/messages");

// OTP Cooldown in seconds
const OTP_COOLDOWN_SECONDS = 30;

class AuthService {
  // Check if OTP can be sent (cooldown check)
  static checkOTPCooldown(lastOTPSentAt) {
    if (!lastOTPSentAt) {
      return { canSend: true, waitSeconds: 0 };
    }

    const now = new Date();
    const lastSent = new Date(lastOTPSentAt);
    const elapsedSeconds = Math.floor((now - lastSent) / 1000);
    const waitSeconds = Math.max(0, OTP_COOLDOWN_SECONDS - elapsedSeconds);

    return {
      canSend: waitSeconds === 0,
      waitSeconds,
    };
  }

  // Send OTP for registration
  static async sendRegistrationOTP(email) {
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser && existingUser.isEmailVerified) {
      throw {
        message: messages.ERROR.EMAIL_ALREADY_EXISTS,
        statusCode: messages.STATUS_CODES.CONFLICT,
      };
    }

    // Check OTP cooldown
    if (existingUser) {
      const cooldown = this.checkOTPCooldown(existingUser.lastRegistrationOTPSentAt);
      if (!cooldown.canSend) {
        throw {
          message: `Please wait ${cooldown.waitSeconds} seconds before requesting another OTP`,
          statusCode: messages.STATUS_CODES.BAD_REQUEST,
          data: { waitSeconds: cooldown.waitSeconds },
        };
      }
    }

    const otp = EmailService.generateOTP();
    const otpExpiry = EmailService.getOTPExpiry();

    // Send OTP email
    await EmailService.sendRegistrationOTP(email, otp);

    // Create or update user with OTP
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        email: email.toLowerCase(),
        registrationOTP: otp,
        otpExpiry,
        lastRegistrationOTPSentAt: new Date(),
        isEmailVerified: false,
      },
      { upsert: true, new: true }
    );

    return {
      message: messages.SUCCESS.OTP_SENT,
      email: email.toLowerCase(),
      waitSeconds: OTP_COOLDOWN_SECONDS,
    };
  }

  // Verify OTP and register user
  static async verifyRegistrationOTP(email, otp, password) {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      throw {
        message: messages.ERROR.USER_NOT_FOUND,
        statusCode: messages.STATUS_CODES.NOT_FOUND,
      };
    }

    if (user.isEmailVerified) {
      throw {
        message: messages.ERROR.ALREADY_VERIFIED,
        statusCode: messages.STATUS_CODES.CONFLICT,
      };
    }

    if (!user.registrationOTP || user.registrationOTP !== otp) {
      throw {
        message: messages.ERROR.INVALID_OTP,
        statusCode: messages.STATUS_CODES.BAD_REQUEST,
      };
    }

    if (EmailService.isOTPExpired(user.otpExpiry)) {
      throw {
        message: messages.ERROR.OTP_EXPIRED,
        statusCode: messages.STATUS_CODES.BAD_REQUEST,
      };
    }

    // Update user
    user.password = password;
    user.isEmailVerified = true;
    user.registrationOTP = null;
    user.otpExpiry = null;
    await user.save();

    // Send welcome email
    try {
      await EmailService.sendWelcomeEmail(email);
    } catch (error) {
      console.error("Welcome email failed:", error);
      // Don't throw, registration is already successful
    }

    // Generate tokens
    const tokens = JWTService.generateTokenPair(user._id.toString(), user.email);

    // Store refresh token in DB
    user.refreshTokens.push({ token: tokens.refreshToken });
    await user.save();

    return {
      message: messages.SUCCESS.USER_REGISTERED,
      data: {
        user: user.toJSON(),
        ...tokens,
      },
    };
  }

  // Login user
  static async login(email, password) {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      throw {
        message: messages.ERROR.INVALID_CREDENTIALS,
        statusCode: messages.STATUS_CODES.BAD_REQUEST,
      };
    }

    if (!user.isEmailVerified) {
      throw {
        message: messages.ERROR.NOT_VERIFIED,
        statusCode: messages.STATUS_CODES.FORBIDDEN,
      };
    }

    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      throw {
        message: messages.ERROR.INVALID_CREDENTIALS,
        statusCode: messages.STATUS_CODES.BAD_REQUEST,
      };
    }

    // Generate tokens
    const tokens = JWTService.generateTokenPair(user._id.toString(), user.email);

    // Store refresh token
    user.refreshTokens.push({ token: tokens.refreshToken });
    await user.save();

    return {
      message: messages.SUCCESS.LOGIN_SUCCESS,
      data: {
        user: user.toJSON(),
        ...tokens,
      },
    };
  }

  // Refresh access token
  static async refreshAccessToken(refreshToken) {
    try {
      const decoded = JWTService.verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.userId);

      if (!user) {
        throw {
          message: messages.ERROR.USER_NOT_FOUND,
          statusCode: messages.STATUS_CODES.NOT_FOUND,
        };
      }

      // Check if refresh token is stored in DB
      const tokenExists = user.refreshTokens.some(
        (rt) => rt.token === refreshToken
      );

      if (!tokenExists) {
        throw {
          message: messages.ERROR.INVALID_TOKEN,
          statusCode: messages.STATUS_CODES.UNAUTHORIZED,
        };
      }

      // Generate new tokens
      const tokens = JWTService.generateTokenPair(user._id.toString(), user.email);

      // Replace old refresh token with new one
      user.refreshTokens = user.refreshTokens.filter(
        (rt) => rt.token !== refreshToken
      );
      user.refreshTokens.push({ token: tokens.refreshToken });
      await user.save();

      return {
        message: messages.SUCCESS.TOKEN_REFRESHED,
        data: tokens,
      };
    } catch (error) {
      throw {
        message: error.message || messages.ERROR.INVALID_TOKEN,
        statusCode: messages.STATUS_CODES.UNAUTHORIZED,
      };
    }
  }

  // Change password
  static async changePassword(userId, oldPassword, newPassword) {
    const user = await User.findById(userId);

    if (!user) {
      throw {
        message: messages.ERROR.USER_NOT_FOUND,
        statusCode: messages.STATUS_CODES.NOT_FOUND,
      };
    }

    const isPasswordCorrect = await user.comparePassword(oldPassword);

    if (!isPasswordCorrect) {
      throw {
        message: messages.ERROR.INVALID_CREDENTIALS,
        statusCode: messages.STATUS_CODES.BAD_REQUEST,
      };
    }

    if (oldPassword === newPassword) {
      throw {
        message: messages.ERROR.SAME_PASSWORD,
        statusCode: messages.STATUS_CODES.BAD_REQUEST,
      };
    }

    user.password = newPassword;
    user.refreshTokens = []; // Invalidate all refresh tokens for security
    await user.save();

    return {
      message: messages.SUCCESS.PASSWORD_CHANGED,
    };
  }

  // Send forgot password OTP
  static async sendForgotPasswordOTP(email) {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      throw {
        message: messages.ERROR.USER_NOT_FOUND,
        statusCode: messages.STATUS_CODES.NOT_FOUND,
      };
    }

    // Check OTP cooldown
    const cooldown = this.checkOTPCooldown(user.lastForgotPasswordOTPSentAt);
    if (!cooldown.canSend) {
      throw {
        message: `Please wait ${cooldown.waitSeconds} seconds before requesting another OTP`,
        statusCode: messages.STATUS_CODES.BAD_REQUEST,
        data: { waitSeconds: cooldown.waitSeconds },
      };
    }

    const otp = EmailService.generateOTP();
    const otpExpiry = EmailService.getOTPExpiry();

    // Send OTP email
    await EmailService.sendPasswordResetOTP(email, otp);

    // Store OTP
    user.forgotPasswordOTP = otp;
    user.otpExpiry = otpExpiry;
    user.lastForgotPasswordOTPSentAt = new Date();
    await user.save();

    return {
      message: messages.SUCCESS.OTP_SENT,
      email: email.toLowerCase(),
      waitSeconds: OTP_COOLDOWN_SECONDS,
    };
  }

  // Verify forgot password OTP and reset password
  static async verifyForgotPasswordOTP(email, otp, newPassword) {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      throw {
        message: messages.ERROR.USER_NOT_FOUND,
        statusCode: messages.STATUS_CODES.NOT_FOUND,
      };
    }

    if (!user.forgotPasswordOTP || user.forgotPasswordOTP !== otp) {
      throw {
        message: messages.ERROR.INVALID_OTP,
        statusCode: messages.STATUS_CODES.BAD_REQUEST,
      };
    }

    if (EmailService.isOTPExpired(user.otpExpiry)) {
      throw {
        message: messages.ERROR.OTP_EXPIRED,
        statusCode: messages.STATUS_CODES.BAD_REQUEST,
      };
    }

    // Update password
    user.password = newPassword;
    user.forgotPasswordOTP = null;
    user.otpExpiry = null;
    user.refreshTokens = []; // Invalidate all refresh tokens
    await user.save();

    return {
      message: messages.SUCCESS.PASSWORD_RESET,
    };
  }

  // Logout
  static async logout(userId, refreshToken) {
    const user = await User.findById(userId);

    if (!user) {
      throw {
        message: messages.ERROR.USER_NOT_FOUND,
        statusCode: messages.STATUS_CODES.NOT_FOUND,
      };
    }

    // Remove refresh token from DB
    user.refreshTokens = user.refreshTokens.filter(
      (rt) => rt.token !== refreshToken
    );
    await user.save();

    return {
      message: messages.SUCCESS.LOGOUT_SUCCESS,
    };
  }

  // Get user by ID
  static async getUserById(userId) {
    const user = await User.findById(userId);

    if (!user) {
      throw {
        message: messages.ERROR.USER_NOT_FOUND,
        statusCode: messages.STATUS_CODES.NOT_FOUND,
      };
    }

    return {
      message: messages.SUCCESS.USER_FETCHED,
      data: user.toJSON(),
    };
  }
}

module.exports = AuthService;
