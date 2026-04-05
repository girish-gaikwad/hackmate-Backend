// Error and success messages
module.exports = {
  // Success messages
  SUCCESS: {
    OTP_SENT: "OTP sent successfully to your email",
    USER_REGISTERED: "User registered successfully",
    LOGIN_SUCCESS: "Login successful",
    LOGOUT_SUCCESS: "Logged out successfully",
    PASSWORD_CHANGED: "Password changed successfully",
    TOKEN_REFRESHED: "Token refreshed successfully",
    PASSWORD_RESET: "Password reset successfully",
    USER_FETCHED: "User data fetched successfully",
  },

  // Error messages
  ERROR: {
    INVALID_EMAIL: "Please provide a valid email address",
    EMAIL_ALREADY_EXISTS: "Email already registered",
    INVALID_PASSWORD: "Password must be at least 8 characters",
    INVALID_OTP: "Invalid or expired OTP",
    OTP_EXPIRED: "OTP has expired. Please request a new one",
    OTP_COOLDOWN: "Please wait before requesting another OTP",
    USER_NOT_FOUND: "User not found",
    INVALID_CREDENTIALS: "Invalid email or password",
    UNAUTHORIZED: "Unauthorized access",
    INVALID_TOKEN: "Invalid or expired token",
    TOKEN_EXPIRED: "Token has expired",
    PASSWORD_MISMATCH: "Passwords do not match",
    SAME_PASSWORD: "New password cannot be the same as old password",
    INTERNAL_ERROR: "Internal server error",
    EMAIL_SEND_ERROR: "Failed to send email",
    DATABASE_ERROR: "Database error occurred",
    ALREADY_VERIFIED: "Email already verified",
    NOT_VERIFIED: "Email not verified. Please verify your email first",
    INCOMPLETE_PROFILE: "Please complete your profile to access this resource",
  },

  // HTTP status codes
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_ERROR: 500,
  },
};
