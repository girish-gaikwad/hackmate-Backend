const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const { errorHandler } = require("./middleware/errorHandler");
const { sendSuccess } = require("./utils/response");

const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded

// Health check route
app.get("/health", (req, res) => {
  return sendSuccess(res, { status: "UP" }, "Server is running");
});

app.get("/", (req, res) => {
  return sendSuccess(res, null, "Welcome to the HackMate API");
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
// 404 handler
app.use((req, res) => {
  return res.status(404).json({
    statusCode: 404,
    success: false,
    message: "Route not found",
  });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
