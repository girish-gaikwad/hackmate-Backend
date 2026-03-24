const express = require('express');
const router = express.Router();
const { teammateRequestController } = require('../controllers');
const { validate } = require('../middleware/validateMiddleware');
const { teammateRequestValidation } = require('../validations');
const { protect } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/v1/teammate-requests:
 *   get:
 *     summary: Get all teammate requests
 *     tags: [TeammateRequests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *       - in: query
 *         name: hackathon
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, closed, fulfilled]
 *     responses:
 *       200:
 *         description: Teammate requests retrieved
 */
router.get(
  '/',
  protect,
  teammateRequestController.getTeammateRequests
);

/**
 * @swagger
 * /api/v1/teammate-requests/college:
 *   get:
 *     summary: Get requests from same college
 *     tags: [TeammateRequests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: College requests retrieved
 */
router.get(
  '/college',
  protect,
  teammateRequestController.getCollegeRequests
);

/**
 * @swagger
 * /api/v1/teammate-requests/hackathon/{hackathonId}:
 *   get:
 *     summary: Get requests by hackathon
 *     tags: [TeammateRequests]
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
 *         description: Hackathon requests retrieved
 */
router.get(
  '/hackathon/:hackathonId',
  protect,
  teammateRequestController.getRequestsByHackathon
);

/**
 * @swagger
 * /api/v1/teammate-requests:
 *   post:
 *     summary: Create a teammate request
 *     tags: [TeammateRequests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTeammateRequestInput'
 *     responses:
 *       201:
 *         description: Request created successfully
 */
router.post(
  '/',
  protect,
  validate(teammateRequestValidation.createRequest),
  teammateRequestController.createTeammateRequest
);

/**
 * @swagger
 * /api/v1/teammate-requests/{id}:
 *   get:
 *     summary: Get a teammate request by ID
 *     tags: [TeammateRequests]
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
 *         description: Request retrieved
 *       404:
 *         description: Request not found
 */
router.get(
  '/:id',
  protect,
  teammateRequestController.getTeammateRequest
);

/**
 * @swagger
 * /api/v1/teammate-requests/{id}:
 *   put:
 *     summary: Update a teammate request
 *     tags: [TeammateRequests]
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
 *         description: Request updated
 */
router.put(
  '/:id',
  protect,
  validate(teammateRequestValidation.updateRequest),
  teammateRequestController.updateTeammateRequest
);

/**
 * @swagger
 * /api/v1/teammate-requests/{id}:
 *   delete:
 *     summary: Delete a teammate request
 *     tags: [TeammateRequests]
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
 *         description: Request deleted
 */
router.delete(
  '/:id',
  protect,
  teammateRequestController.deleteTeammateRequest
);

/**
 * @swagger
 * /api/v1/teammate-requests/{id}/interest:
 *   post:
 *     summary: Express interest in a request
 *     tags: [TeammateRequests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Interest expressed
 */
router.post(
  '/:id/interest',
  protect,
  validate(teammateRequestValidation.expressInterest),
  teammateRequestController.expressInterest
);

/**
 * @swagger
 * /api/v1/teammate-requests/{id}/interest:
 *   delete:
 *     summary: Withdraw interest from a request
 *     tags: [TeammateRequests]
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
 *         description: Interest withdrawn
 */
router.delete(
  '/:id/interest',
  protect,
  teammateRequestController.withdrawInterest
);

/**
 * @swagger
 * /api/v1/teammate-requests/{id}/accept/{userId}:
 *   post:
 *     summary: Accept an interested user
 *     tags: [TeammateRequests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Interest accepted
 */
router.post(
  '/:id/accept/:userId',
  protect,
  teammateRequestController.acceptInterest
);

/**
 * @swagger
 * /api/v1/teammate-requests/{id}/reject/{userId}:
 *   post:
 *     summary: Reject an interested user
 *     tags: [TeammateRequests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Interest rejected
 */
router.post(
  '/:id/reject/:userId',
  protect,
  teammateRequestController.rejectInterest
);

/**
 * @swagger
 * /api/v1/teammate-requests/{id}/close:
 *   put:
 *     summary: Close a teammate request
 *     tags: [TeammateRequests]
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
 *         description: Request closed
 */
router.put(
  '/:id/close',
  protect,
  teammateRequestController.closeRequest
);

/**
 * @swagger
 * /api/v1/teammate-requests/{id}/fulfill:
 *   put:
 *     summary: Mark request as fulfilled
 *     tags: [TeammateRequests]
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
 *         description: Request marked as fulfilled
 */
router.put(
  '/:id/fulfill',
  protect,
  teammateRequestController.fulfillRequest
);

module.exports = router;
