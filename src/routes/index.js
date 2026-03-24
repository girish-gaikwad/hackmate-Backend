const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const hackathonRoutes = require('./hackathonRoutes');
const teammateRequestRoutes = require('./teammateRequestRoutes');
const teamRoutes = require('./teamRoutes');
const resourceRoutes = require('./resourceRoutes');
const bookmarkRoutes = require('./bookmarkRoutes');
const messageRoutes = require('./messageRoutes');
const notificationRoutes = require('./notificationRoutes');
const adminRoutes = require('./adminRoutes');
const searchRoutes = require('./searchRoutes');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API version info
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'College Hackathon Companion API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      hackathons: '/api/v1/hackathons',
      teammateRequests: '/api/v1/teammate-requests',
      teams: '/api/v1/teams',
      resources: '/api/v1/resources',
      bookmarks: '/api/v1/bookmarks',
      messages: '/api/v1/messages',
      notifications: '/api/v1/notifications',
      admin: '/api/v1/admin',
      search: '/api/v1/search'
    }
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/hackathons', hackathonRoutes);
router.use('/teammate-requests', teammateRequestRoutes);
router.use('/teams', teamRoutes);
router.use('/resources', resourceRoutes);
router.use('/bookmarks', bookmarkRoutes);
router.use('/messages', messageRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/search', searchRoutes);

module.exports = router;
