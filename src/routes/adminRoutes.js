const express = require('express');
const router = express.Router();
const { adminController } = require('../controllers');
const { validate } = require('../middleware/validateMiddleware');
const { protect, admin } = require('../middleware/authMiddleware');
const Joi = require('joi');

// Validation schemas for admin routes
const adminValidation = {
  updateUserStatus: Joi.object({
    body: Joi.object({
      isActive: Joi.boolean(),
      isVerified: Joi.boolean(),
      role: Joi.string().valid('user', 'admin')
    }).min(1),
    params: Joi.object({
      id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
    })
  }),
  createCollegeDomain: Joi.object({
    body: Joi.object({
      domain: Joi.string().required().pattern(/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/),
      collegeName: Joi.string().required().max(200),
      location: Joi.object({
        city: Joi.string().max(100),
        state: Joi.string().max(100),
        country: Joi.string().max(100)
      }),
      isVerified: Joi.boolean()
    })
  }),
  updateCollegeDomain: Joi.object({
    body: Joi.object({
      domain: Joi.string().pattern(/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/),
      collegeName: Joi.string().max(200),
      location: Joi.object({
        city: Joi.string().max(100),
        state: Joi.string().max(100),
        country: Joi.string().max(100)
      }),
      isVerified: Joi.boolean()
    }).min(1),
    params: Joi.object({
      id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
    })
  }),
  updateHackathonStatus: Joi.object({
    body: Joi.object({
      isActive: Joi.boolean(),
      isFeatured: Joi.boolean()
    }).min(1),
    params: Joi.object({
      id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
    })
  })
};

// Apply protect and admin middleware to all routes
router.use(protect, admin);


router.get(
  '/dashboard',
  adminController.getDashboardStats
);


router.get(
  '/analytics',
  adminController.getDashboardStats
);

// =====================
// User Management Routes
// =====================


router.get(
  '/users',
  adminController.getUsers
);


router.get(
  '/users/:id',
  adminController.getUser
);


router.put(
  '/users/:id/status',
  validate(adminValidation.updateUserStatus),
  adminController.updateUser
);


router.delete(
  '/users/:id',
  adminController.deleteUser
);

// =====================
// Hackathon Management Routes
// =====================


router.get(
  '/hackathons',
  adminController.getHackathons
);


router.put(
  '/hackathons/:id/status',
  validate(adminValidation.updateHackathonStatus),
  adminController.toggleFeatured
);


router.post(
  '/hackathons/sync',
  adminController.syncHackathons
);

// =====================
// College Domain Management Routes
// =====================


router.get(
  '/college-domains',
  adminController.getCollegeDomains
);


router.post(
  '/college-domains',
  validate(adminValidation.createCollegeDomain),
  adminController.addCollegeDomain
);


router.put(
  '/college-domains/:id',
  validate(adminValidation.updateCollegeDomain),
  adminController.updateCollegeDomain
);


router.delete(
  '/college-domains/:id',
  adminController.deleteCollegeDomain
);

// =====================
// Activity Logs Routes
// =====================


router.get(
  '/activity-logs',
  adminController.getActivityLogs
);

module.exports = router;
