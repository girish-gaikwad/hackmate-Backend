const path = require("path");
// require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

require("dotenv").config();

const config = {
  // Server
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",

  // Database
  MONGODB_URI:
    process.env.MONGODB_URI || "mongodb://localhost:27017/hackmate-auth",

  // JWT Secrets
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "your-access-secret-key",
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",

  // JWT Expiry
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || "15m",
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || "7d",

  // OTP Configuration
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 10,

  // Email Configuration (Resend)
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || "noreply@hackmate.com",

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 5, // 5 requests per window

  // BCrypt
  BCRYPT_ROUNDS: 10,
};

// Validate required environment variables
const requiredEnvVars = ["RESEND_API_KEY"];

const missingEnvVars = requiredEnvVars.filter(
  (envVar) => !process.env[envVar]
);

if (missingEnvVars.length > 0 && process.env.NODE_ENV === "production") {
  console.error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
  process.exit(1);
}

module.exports = config;
