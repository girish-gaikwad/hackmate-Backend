const User = require("../models/User");
const CollegeDomain = require("../models/CollegeDomain");
const {
  ApiError,
  ApiResponse,
  asyncHandler,
  generateTokenPair,
  sendEmail,
} = require("../utils");
const { EmailService, AnalyticsService } = require("../services");
const crypto = require("crypto");

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, major, graduationYear } =
    req.body;
  console.log("Registering user:", req.body);
  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ApiError(400, "User already exists with this email");
  }

  // Verify college domain if provided
  const emailDomain = email.split("@")[1];
  const collegeInfo = await CollegeDomain.findOne({
    domain: emailDomain,
    isActive: true,
  });

  if (!collegeInfo) {
    throw new ApiError(400, "Your email domain is not associated with an active college. Please contact support.");
  }

  // Generate email verification token
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email: email.toLowerCase(),
    password,
    collegeName: collegeInfo.collegeName,
    verificationToken,
    verificationTokenExpires,
    major,
    graduationYear,
    collegeDomain: collegeInfo.domain,
  });

  // Send verification email
//   await EmailService.sendVerificationEmail(user.email, verificationToken);

  // Log activity
  await AnalyticsService.logActivity({
    user: user._id,
    action: "register",
    entityType: "user",
    entityId: user._id,
    ipAddress: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Generate tokens
  const tokens = generateTokenPair(user);

  res.status(201).json(
    new ApiResponse(
      201,
      {
        user: user.toJSON(),
        ...tokens,
      },
      "Registration successful. Please verify your email.",
    ),
  );
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user with password
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password",
  );

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Check if user is active
  if (!user.isActive) {
    throw new ApiError(
      403,
      "Your account has been deactivated. Please contact support.",
    );
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Log activity
  await AnalyticsService.logActivity({
    user: user._id,
    action: "login",
    entityType: "user",
    entityId: user._id,
    ipAddress: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Generate tokens
  const tokens = generateTokenPair(user);

  res.json(
    new ApiResponse(
      200,
      {
        user: user.toJSON(),
        ...tokens,
      },
      "Login successful",
    ),
  );
});

/**
 * @desc    Verify email
 * @route   GET /api/v1/auth/verify-email/:token
 * @access  Public
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired verification token");
  }

  // Verify user
  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();

  // Send welcome email
  await EmailService.sendWelcomeEmail(user.email, user.firstName);

  res.json(new ApiResponse(200, null, "Email verified successfully"));
});

/**
 * @desc    Resend verification email
 * @route   POST /api/v1/auth/resend-verification
 * @access  Public
 */
const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    // Don't reveal if user exists
    return res.json(
      new ApiResponse(
        200,
        null,
        "If your email is registered, you will receive a verification link.",
      ),
    );
  }

  if (user.isVerified) {
    throw new ApiError(400, "Email is already verified");
  }

  // Generate new verification token
  const verificationToken = crypto.randomBytes(32).toString("hex");
  user.verificationToken = verificationToken;
  user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  // Send verification email
  await EmailService.sendVerificationEmail(user.email, verificationToken);

  res.json(
    new ApiResponse(
      200,
      null,
      "If your email is registered, you will receive a verification link.",
    ),
  );
});

/**
 * @desc    Forgot password
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    // Don't reveal if user exists
    return res.json(
      new ApiResponse(
        200,
        null,
        "If your email is registered, you will receive a password reset link.",
      ),
    );
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  user.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  // Send password reset email
  await EmailService.sendPasswordResetEmail(user.email, resetToken);

  res.json(
    new ApiResponse(
      200,
      null,
      "If your email is registered, you will receive a password reset link.",
    ),
  );
});

/**
 * @desc    Reset password
 * @route   POST /api/v1/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  // Hash the token from URL
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  // Update password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Log activity
  await AnalyticsService.logActivity({
    user: user._id,
    action: "password_reset",
    entityType: "user",
    entityId: user._id,
    ipAddress: req.ip,
    userAgent: req.get("User-Agent"),
  });

  res.json(
    new ApiResponse(
      200,
      null,
      "Password reset successful. You can now login with your new password.",
    ),
  );
});

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    throw new ApiError(400, "Refresh token is required");
  }

  // Verify refresh token
  const jwt = require("jsonwebtoken");
  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  // Find user
  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    throw new ApiError(401, "User not found or inactive");
  }

  // Generate new tokens
  const tokens = generateTokenPair(user);

  res.json(new ApiResponse(200, tokens, "Token refreshed successfully"));
});

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // Log activity
  await AnalyticsService.logActivity({
    user: req.user._id,
    action: "logout",
    entityType: "user",
    entityId: req.user._id,
    ipAddress: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // In a production app, you might want to blacklist the token
  // For now, we just return success and let the client handle token removal

  res.json(new ApiResponse(200, null, "Logged out successfully"));
});

/**
 * @desc    Get current user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  res.json(new ApiResponse(200, { user }, "User retrieved successfully"));
});

/**
 * @desc    Change password
 * @route   PUT /api/v1/auth/change-password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");

  // Verify current password
  const isPasswordValid = await user.comparePassword(currentPassword);
  if (!isPasswordValid) {
    throw new ApiError(401, "Current password is incorrect");
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Log activity
  await AnalyticsService.logActivity({
    user: user._id,
    action: "password_change",
    entityType: "user",
    entityId: user._id,
    ipAddress: req.ip,
    userAgent: req.get("User-Agent"),
  });

  res.json(new ApiResponse(200, null, "Password changed successfully"));
});

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  getMe,
  changePassword,
};
