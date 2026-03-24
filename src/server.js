const http = require('http');
const app = require('./app');
const connectDB = require('./config/database');
const logger = require('./utils/logger');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...');
  logger.error(`${err.name}: ${err.message}`);
  logger.error(err.stack);
  process.exit(1);
});

// Load environment variables
require('dotenv').config();

// Connect to database
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Socket.io setup (will be implemented in socket/index.js)
let io;
try {
  const { Server } = require('socket.io');
  const { initializeSocket } = require('./socket');
  
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN 
        ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
        : ['http://localhost:3000', 'http://localhost:5173'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Initialize socket handlers
  initializeSocket(io);
  
  // Make io accessible to routes
  app.set('io', io);
  
  logger.info('Socket.io initialized successfully');
} catch (error) {
  logger.warn('Socket.io not initialized:', error.message);
}

// Start cron jobs
try {
  const { startCronJobs } = require('./cron');
  startCronJobs();
  logger.info('Cron jobs started successfully');
} catch (error) {
  logger.warn('Cron jobs not started:', error.message);
}

// Get port from environment
const PORT = process.env.PORT || 5000;

// Start server
server.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
  logger.info(`Health check at http://localhost:${PORT}/api/v1/health`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! Shutting down...');
  logger.error(`${err.name}: ${err.message}`);
  logger.error(err.stack);
  
  // Close server gracefully
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM signal (for graceful shutdown in production)
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  
  server.close(() => {
    logger.info('Process terminated!');
    process.exit(0);
  });
});

// Handle SIGINT signal (Ctrl+C)
process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  
  server.close(() => {
    logger.info('Process terminated!');
    process.exit(0);
  });
});

module.exports = server;
