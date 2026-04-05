const app = require("./src/app");
const config = require("./src/config/env");
const connectDB = require("./src/config/database");

// Connect to database
connectDB().then(() => {
  console.log("Database connected successfully");

  // Start server
  app.listen(config.PORT, () => {
    console.log(
      `🚀 Server is running on http://localhost:${config.PORT}`
    );
    console.log(`📝 Node Environment: ${config.NODE_ENV}`);
    console.log(`📊 Database: ${config.MONGODB_URI}`);
    console.log("\n📍 API Routes:");
    console.log("  POST   /api/auth/register/send-otp");
    console.log("  POST   /api/auth/register/verify-otp");
    console.log("  POST   /api/auth/login");
    console.log("  POST   /api/auth/logout");
    console.log("  POST   /api/auth/refresh-token");
    console.log("  POST   /api/auth/change-password");
    console.log("  POST   /api/auth/forgot-password/send-otp");
    console.log("  POST   /api/auth/forgot-password/verify-otp");
    console.log("  GET    /api/auth/me");
  });
}).catch((error) => {
  console.error("Failed to connect to database:", error.message);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
