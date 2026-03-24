const express = require('express');
const router = express.Router();
const { userController } = require('../controllers');
const { validate } = require('../middleware/validateMiddleware');
const { userValidation } = require('../validations');
const { protect } = require('../middleware/authMiddleware');
const { uploadProfile } = require('../middleware/uploadMiddleware');

/**
 * @swagger
 * /api/v1/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileInput'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put(
  '/profile',
  protect,
  validate(userValidation.updateProfile),
  userController.updateProfile
);

/**
 * @swagger
 * /api/v1/users/profile/picture:
 *   put:
 *     summary: Update profile picture
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile picture updated
 */
router.put(
  '/profile/picture',
  protect,
  uploadProfile.single('profilePicture'),
  userController.updateProfilePicture
);

/**
 * @swagger
 * /api/v1/users/profile/picture:
 *   delete:
 *     summary: Delete profile picture
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile picture deleted
 */
router.delete(
  '/profile/picture',
  protect,
  userController.deleteProfilePicture
);

/**
 * @swagger
 * /api/v1/users/bookmarks:
 *   get:
 *     summary: Get user's bookmarks
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [hackathon, resource]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bookmarks retrieved
 */
router.get(
  '/bookmarks',
  protect,
  userController.getUserBookmarks
);

/**
 * @swagger
 * /api/v1/users/looking-for-team:
 *   get:
 *     summary: Get users looking for team
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *       - in: query
 *         name: college
 *         schema:
 *           type: string
 *       - in: query
 *         name: experienceLevel
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Users list retrieved
 */
router.get(
  '/looking-for-team',
  protect,
  userController.getUsersLookingForTeam
);

/**
 * @swagger
 * /api/v1/users/notifications/settings:
 *   put:
 *     summary: Update notification settings
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings updated
 */
router.put(
  '/notifications/settings',
  protect,
  validate(userValidation.updateNotificationSettings),
  userController.updateNotificationSettings
);

/**
 * @swagger
 * /api/v1/users/account:
 *   delete:
 *     summary: Deactivate account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account deactivated
 */
router.delete(
  '/account',
  protect,
  userController.deactivateAccount
);

/**
 * @swagger
 * /api/v1/users/activity:
 *   get:
 *     summary: Get user's activity feed
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Activity feed retrieved
 */
router.get(
  '/activity',
  protect,
  userController.getUserActivity
);

/**
 * @swagger
 * /api/v1/users/engagement-score:
 *   get:
 *     summary: Get user's engagement score
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Engagement score retrieved
 */
router.get(
  '/engagement-score',
  protect,
  userController.getEngagementScore
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user profile by ID
 *     tags: [Users]
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
 *         description: User profile retrieved
 *       404:
 *         description: User not found
 */
router.get(
  '/:id',
  protect,
  userController.getUserById
);

/**
 * @swagger
 * /api/v1/users/{id}/teams:
 *   get:
 *     summary: Get user's teams
 *     tags: [Users]
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
 *         description: Teams retrieved
 */
router.get(
  '/:id/teams',
  protect,
  userController.getUserTeams
);

/**
 * @swagger
 * /api/v1/users/{id}/requests:
 *   get:
 *     summary: Get user's teammate requests
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Requests retrieved
 */
router.get(
  '/:id/requests',
  protect,
  userController.getUserRequests
);

/**
 * @swagger
 * /api/v1/users/{id}/resources:
 *   get:
 *     summary: Get user's shared resources
 *     tags: [Users]
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
 *         description: Resources retrieved
 */
router.get(
  '/:id/resources',
  protect,
  userController.getUserResources
);

module.exports = router;
