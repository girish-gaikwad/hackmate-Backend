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

/**
 * @swagger
 * /api/v1/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved
 */
router.get(
  '/dashboard',
  adminController.getDashboardStats
);

/**
 * @swagger
 * /api/v1/admin/analytics:
 *   get:
 *     summary: Get platform analytics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Analytics data retrieved
 */
router.get(
  '/analytics',
  adminController.getDashboardStats
);

// =====================
// User Management Routes
// =====================

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get all users with filters
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Users retrieved
 */
router.get(
  '/users',
  adminController.getUsers
);

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   get:
 *     summary: Get user details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details retrieved
 */
router.get(
  '/users/:id',
  adminController.getUser
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/status:
 *   put:
 *     summary: Update user status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *               isVerified:
 *                 type: boolean
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: User status updated
 */
router.put(
  '/users/:id/status',
  validate(adminValidation.updateUserStatus),
  adminController.updateUser
);

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   delete:
 *     summary: Delete user account
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete(
  '/users/:id',
  adminController.deleteUser
);

// =====================
// Hackathon Management Routes
// =====================

/**
 * @swagger
 * /api/v1/admin/hackathons:
 *   get:
 *     summary: Get all hackathons with filters
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: isFeatured
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Hackathons retrieved
 */
router.get(
  '/hackathons',
  adminController.getHackathons
);

/**
 * @swagger
 * /api/v1/admin/hackathons/{id}/status:
 *   put:
 *     summary: Update hackathon status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *               isFeatured:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Hackathon status updated
 */
router.put(
  '/hackathons/:id/status',
  validate(adminValidation.updateHackathonStatus),
  adminController.toggleFeatured
);

/**
 * @swagger
 * /api/v1/admin/hackathons/sync:
 *   post:
 *     summary: Trigger hackathon sync from external sources
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               source:
 *                 type: string
 *                 enum: [devpost, mlh, all]
 *     responses:
 *       200:
 *         description: Sync initiated
 */
router.post(
  '/hackathons/sync',
  adminController.syncHackathons
);

// =====================
// College Domain Management Routes
// =====================

/**
 * @swagger
 * /api/v1/admin/college-domains:
 *   get:
 *     summary: Get all college domains
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: College domains retrieved
 */
router.get(
  '/college-domains',
  adminController.getCollegeDomains
);

/**
 * @swagger
 * /api/v1/admin/college-domains:
 *   post:
 *     summary: Add new college domain
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - domain
 *               - collegeName
 *             properties:
 *               domain:
 *                 type: string
 *               collegeName:
 *                 type: string
 *               location:
 *                 type: object
 *                 properties:
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   country:
 *                     type: string
 *               isVerified:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: College domain created
 */
router.post(
  '/college-domains',
  validate(adminValidation.createCollegeDomain),
  adminController.addCollegeDomain
);

/**
 * @swagger
 * /api/v1/admin/college-domains/{id}:
 *   put:
 *     summary: Update college domain
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               domain:
 *                 type: string
 *               collegeName:
 *                 type: string
 *               location:
 *                 type: object
 *               isVerified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: College domain updated
 */
router.put(
  '/college-domains/:id',
  validate(adminValidation.updateCollegeDomain),
  adminController.updateCollegeDomain
);

/**
 * @swagger
 * /api/v1/admin/college-domains/{id}:
 *   delete:
 *     summary: Delete college domain
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: College domain deleted
 */
router.delete(
  '/college-domains/:id',
  adminController.deleteCollegeDomain
);

// =====================
// Activity Logs Routes
// =====================

/**
 * @swagger
 * /api/v1/admin/activity-logs:
 *   get:
 *     summary: Get activity logs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Activity logs retrieved
 */
router.get(
  '/activity-logs',
  adminController.getActivityLogs
);

module.exports = router;
