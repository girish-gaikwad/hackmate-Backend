const express = require('express');
const router = express.Router();
const { hackathonController } = require('../controllers');
const { validate } = require('../middleware/validateMiddleware');
const { hackathonValidation } = require('../validations');
const { protect, admin, optionalAuth } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/v1/hackathons:
 *   get:
 *     summary: Get all hackathons with filters
 *     tags: [Hackathons]
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *       - in: query
 *         name: mode
 *         schema:
 *           type: string
 *           enum: [online, in-person, hybrid]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [upcoming, ongoing, completed]
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
 *         description: Hackathons list retrieved
 */
router.get(
  '/',
  hackathonController.getHackathons
);

/**
 * @swagger
 * /api/v1/hackathons/upcoming:
 *   get:
 *     summary: Get upcoming hackathons
 *     tags: [Hackathons]
 *     responses:
 *       200:
 *         description: Upcoming hackathons retrieved
 */
router.get(
  '/upcoming',
  hackathonController.getUpcomingHackathons
);

/**
 * @swagger
 * /api/v1/hackathons/ongoing:
 *   get:
 *     summary: Get ongoing hackathons
 *     tags: [Hackathons]
 *     responses:
 *       200:
 *         description: Ongoing hackathons retrieved
 */
router.get(
  '/ongoing',
  hackathonController.getOngoingHackathons
);

/**
 * @swagger
 * /api/v1/hackathons/past:
 *   get:
 *     summary: Get past hackathons
 *     tags: [Hackathons]
 *     responses:
 *       200:
 *         description: Past hackathons retrieved
 */
router.get(
  '/past',
  hackathonController.getPastHackathons
);

/**
 * @swagger
 * /api/v1/hackathons/featured:
 *   get:
 *     summary: Get featured hackathons
 *     tags: [Hackathons]
 *     responses:
 *       200:
 *         description: Featured hackathons retrieved
 */
router.get(
  '/featured',
  hackathonController.getFeaturedHackathons
);

/**
 * @swagger
 * /api/v1/hackathons/source/{source}:
 *   get:
 *     summary: Get hackathons by source
 *     tags: [Hackathons]
 *     parameters:
 *       - in: path
 *         name: source
 *         required: true
 *         schema:
 *           type: string
 *           enum: [devpost, mlh, manual]
 *     responses:
 *       200:
 *         description: Hackathons by source retrieved
 */
router.get(
  '/source/:source',
  hackathonController.getHackathonsBySource
);

/**
 * @swagger
 * /api/v1/hackathons:
 *   post:
 *     summary: Create a new hackathon (Admin only)
 *     tags: [Hackathons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateHackathonInput'
 *     responses:
 *       201:
 *         description: Hackathon created successfully
 */
router.post(
  '/',
  protect,
  admin,
  validate(hackathonValidation.createHackathon),
  hackathonController.createHackathon
);

/**
 * @swagger
 * /api/v1/hackathons/{idOrSlug}:
 *   get:
 *     summary: Get hackathon by ID or slug
 *     tags: [Hackathons]
 *     parameters:
 *       - in: path
 *         name: idOrSlug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Hackathon retrieved
 *       404:
 *         description: Hackathon not found
 */
router.get(
  '/:idOrSlug',
  optionalAuth,
  hackathonController.getHackathon
);

/**
 * @swagger
 * /api/v1/hackathons/{id}:
 *   put:
 *     summary: Update hackathon (Admin only)
 *     tags: [Hackathons]
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
 *         description: Hackathon updated
 */
router.put(
  '/:id',
  protect,
  admin,
  validate(hackathonValidation.updateHackathon),
  hackathonController.updateHackathon
);

/**
 * @swagger
 * /api/v1/hackathons/{id}:
 *   delete:
 *     summary: Delete hackathon (Admin only)
 *     tags: [Hackathons]
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
 *         description: Hackathon deleted
 */
router.delete(
  '/:id',
  protect,
  admin,
  hackathonController.deleteHackathon
);

/**
 * @swagger
 * /api/v1/hackathons/{id}/bookmark:
 *   post:
 *     summary: Toggle hackathon bookmark
 *     tags: [Hackathons]
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
 *         description: Bookmark toggled
 */
router.post(
  '/:id/bookmark',
  protect,
  hackathonController.toggleBookmark
);

/**
 * @swagger
 * /api/v1/hackathons/{id}/bookmark:
 *   get:
 *     summary: Check if hackathon is bookmarked
 *     tags: [Hackathons]
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
 *         description: Bookmark status returned
 */
router.get(
  '/:id/bookmark',
  protect,
  hackathonController.checkBookmark
);

/**
 * @swagger
 * /api/v1/hackathons/{id}/stats:
 *   get:
 *     summary: Get hackathon engagement stats
 *     tags: [Hackathons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stats retrieved
 */
router.get(
  '/:id/stats',
  hackathonController.getHackathonStats
);

module.exports = router;
