const express = require('express');
const router = express.Router();
const { bookmarkController } = require('../controllers');
const { validate } = require('../middleware/validateMiddleware');
const { protect } = require('../middleware/authMiddleware');
const Joi = require('joi');

// Validation schemas for bookmarks
const bookmarkValidation = {
  createBookmark: Joi.object({
    body: Joi.object({
      itemType: Joi.string().valid('hackathon', 'resource').required(),
      item: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      notes: Joi.string().max(500).allow(''),
      tags: Joi.array().items(Joi.string().max(50)).max(10),
      notifyBefore: Joi.number().min(1).max(30)
    })
  }),
  updateBookmark: Joi.object({
    body: Joi.object({
      notes: Joi.string().max(500).allow(''),
      tags: Joi.array().items(Joi.string().max(50)).max(10),
      notifyBefore: Joi.number().min(1).max(30)
    }),
    params: Joi.object({
      id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
    })
  })
};

/**
 * @swagger
 * /api/v1/bookmarks:
 *   get:
 *     summary: Get user's bookmarks
 *     tags: [Bookmarks]
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
  '/',
  protect,
  bookmarkController.getBookmarks
);

/**
 * @swagger
 * /api/v1/bookmarks/hackathons:
 *   get:
 *     summary: Get user's hackathon bookmarks
 *     tags: [Bookmarks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hackathon bookmarks retrieved
 */
router.get(
  '/hackathons',
  protect,
  bookmarkController.getBookmarkedHackathons
);

/**
 * @swagger
 * /api/v1/bookmarks/resources:
 *   get:
 *     summary: Get user's resource bookmarks
 *     tags: [Bookmarks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resource bookmarks retrieved
 */
router.get(
  '/resources',
  protect,
  bookmarkController.getBookmarkedResources
);

/**
 * @swagger
 * /api/v1/bookmarks/hackathons/{hackathonId}:
 *   post:
 *     summary: Bookmark a hackathon
 *     tags: [Bookmarks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hackathonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Hackathon bookmarked
 *       400:
 *         description: Already bookmarked
 */
router.post(
  '/hackathons/:hackathonId',
  protect,
  bookmarkController.createHackathonBookmark
);

/**
 * @swagger
 * /api/v1/bookmarks/hackathons/{hackathonId}:
 *   delete:
 *     summary: Remove hackathon bookmark
 *     tags: [Bookmarks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hackathonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bookmark removed
 */
router.delete(
  '/hackathons/:hackathonId',
  protect,
  bookmarkController.deleteHackathonBookmark
);

/**
 * @swagger
 * /api/v1/bookmarks/resources/{resourceId}:
 *   post:
 *     summary: Bookmark a resource
 *     tags: [Bookmarks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Resource bookmarked
 *       400:
 *         description: Already bookmarked
 */
router.post(
  '/resources/:resourceId',
  protect,
  bookmarkController.createResourceBookmark
);

/**
 * @swagger
 * /api/v1/bookmarks/resources/{resourceId}:
 *   delete:
 *     summary: Remove resource bookmark
 *     tags: [Bookmarks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bookmark removed
 */
router.delete(
  '/resources/:resourceId',
  protect,
  bookmarkController.deleteResourceBookmark
);

/**
 * @swagger
 * /api/v1/bookmarks/{id}:
 *   delete:
 *     summary: Delete bookmark by ID
 *     tags: [Bookmarks]
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
 *         description: Bookmark deleted
 */
router.delete(
  '/:id',
  protect,
  bookmarkController.deleteBookmark
);

/**
 * @swagger
 * /api/v1/bookmarks/{id}/notification:
 *   put:
 *     summary: Update bookmark notification settings
 *     tags: [Bookmarks]
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
 *               notifyBefore:
 *                 type: integer
 *                 description: Days before to notify (null to disable)
 *     responses:
 *       200:
 *         description: Notification settings updated
 */
router.put(
  '/:id/notification',
  protect,
  bookmarkController.updateBookmarkNotifications
);

/**
 * @swagger
 * /api/v1/bookmarks/check/{itemType}/{itemId}:
 *   get:
 *     summary: Check if item is bookmarked
 *     tags: [Bookmarks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hackathon, resource]
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bookmark status returned
 */
router.get(
  '/check/:itemType/:itemId',
  protect,
  bookmarkController.checkBookmark
);

module.exports = router;
