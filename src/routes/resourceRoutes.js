const express = require('express');
const router = express.Router();
const { resourceController } = require('../controllers');
const { validate } = require('../middleware/validateMiddleware');
const { resourceValidation } = require('../validations');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { uploadResource } = require('../middleware/uploadMiddleware');

/**
 * @swagger
 * /api/v1/resources:
 *   get:
 *     summary: Get all resources
 *     tags: [Resources]
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resources retrieved
 */
router.get(
  '/',
  resourceController.getResources
);

/**
 * @swagger
 * /api/v1/resources/popular:
 *   get:
 *     summary: Get popular resources
 *     tags: [Resources]
 *     responses:
 *       200:
 *         description: Popular resources retrieved
 */
router.get(
  '/popular',
  resourceController.getPopularResources
);

/**
 * @swagger
 * /api/v1/resources/tags:
 *   get:
 *     summary: Get resource tags
 *     tags: [Resources]
 *     responses:
 *       200:
 *         description: Tags retrieved
 */
router.get(
  '/tags',
  resourceController.getResourceTags
);

/**
 * @swagger
 * /api/v1/resources/category/{category}:
 *   get:
 *     summary: Get resources by category
 *     tags: [Resources]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resources retrieved
 */
router.get(
  '/category/:category',
  resourceController.getResourcesByCategory
);

/**
 * @swagger
 * /api/v1/resources/type/{type}:
 *   get:
 *     summary: Get resources by type
 *     tags: [Resources]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resources retrieved
 */
router.get(
  '/type/:type',
  resourceController.getResourcesByType
);

/**
 * @swagger
 * /api/v1/resources:
 *   post:
 *     summary: Create a new resource
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *               category:
 *                 type: string
 *               url:
 *                 type: string
 *               tags:
 *                 type: array
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Resource created
 */
router.post(
  '/',
  protect,
  uploadResource.single('file'),
  validate(resourceValidation.createResource),
  resourceController.createResource
);

/**
 * @swagger
 * /api/v1/resources/{id}:
 *   get:
 *     summary: Get resource by ID
 *     tags: [Resources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resource retrieved
 *       404:
 *         description: Resource not found
 */
router.get(
  '/:id',
  optionalAuth,
  resourceController.getResource
);

/**
 * @swagger
 * /api/v1/resources/{id}:
 *   put:
 *     summary: Update resource (Owner only)
 *     tags: [Resources]
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
 *         description: Resource updated
 */
router.put(
  '/:id',
  protect,
  uploadResource.single('file'),
  validate(resourceValidation.updateResource),
  resourceController.updateResource
);

/**
 * @swagger
 * /api/v1/resources/{id}:
 *   delete:
 *     summary: Delete resource (Owner only)
 *     tags: [Resources]
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
 *         description: Resource deleted
 */
router.delete(
  '/:id',
  protect,
  resourceController.deleteResource
);

/**
 * @swagger
 * /api/v1/resources/{id}/vote:
 *   post:
 *     summary: Upvote/remove upvote from resource
 *     tags: [Resources]
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
 *         description: Vote updated
 */
router.post(
  '/:id/vote',
  protect,
  resourceController.toggleVote
);

/**
 * @swagger
 * /api/v1/resources/{id}/downvote:
 *   post:
 *     summary: Downvote/remove downvote from resource
 *     tags: [Resources]
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
 *         description: Vote updated
 */
router.post(
  '/:id/downvote',
  protect,
  resourceController.toggleDownvote
);

/**
 * @swagger
 * /api/v1/resources/{id}/comments:
 *   post:
 *     summary: Add comment to resource
 *     tags: [Resources]
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
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment added
 */
router.post(
  '/:id/comments',
  protect,
  validate(resourceValidation.addComment),
  resourceController.addComment
);

/**
 * @swagger
 * /api/v1/resources/{id}/comments/{commentId}:
 *   delete:
 *     summary: Delete comment from resource
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment deleted
 */
router.delete(
  '/:id/comments/:commentId',
  protect,
  resourceController.deleteComment
);

/**
 * @swagger
 * /api/v1/resources/{id}/bookmark:
 *   post:
 *     summary: Toggle resource bookmark
 *     tags: [Resources]
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
  resourceController.toggleBookmark
);

module.exports = router;
