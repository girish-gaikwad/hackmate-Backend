const express = require('express');
const router = express.Router();
const { messageController } = require('../controllers');
const { validate } = require('../middleware/validateMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { uploadMessageAttachment } = require('../middleware/uploadMiddleware');
const Joi = require('joi');

// Validation schemas for messages
const messageValidation = {
  sendDirectMessage: Joi.object({
    body: Joi.object({
      content: Joi.string().max(5000).when('attachment', {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.required()
      }),
      attachment: Joi.any()
    }),
    params: Joi.object({
      userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
    })
  }),
  sendTeamMessage: Joi.object({
    body: Joi.object({
      content: Joi.string().max(5000).when('attachment', {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.required()
      }),
      attachment: Joi.any()
    }),
    params: Joi.object({
      teamId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
    })
  }),
  searchMessages: Joi.object({
    query: Joi.object({
      q: Joi.string().min(1).max(100).required(),
      conversationType: Joi.string().valid('direct', 'team'),
      page: Joi.number().integer().min(1),
      limit: Joi.number().integer().min(1).max(50)
    })
  })
};

/**
 * @swagger
 * /api/v1/messages/conversations:
 *   get:
 *     summary: Get all conversations
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [direct, team, all]
 *     responses:
 *       200:
 *         description: Conversations retrieved
 */
router.get(
  '/conversations',
  protect,
  messageController.getConversations
);

/**
 * @swagger
 * /api/v1/messages/direct/{userId}:
 *   get:
 *     summary: Get direct messages with a user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
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
 *         description: Messages retrieved
 */
router.get(
  '/direct/:userId',
  protect,
  messageController.getDirectMessages
);

/**
 * @swagger
 * /api/v1/messages/direct/{userId}:
 *   post:
 *     summary: Send direct message to a user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               attachment:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Message sent
 */
router.post(
  '/direct/:userId',
  protect,
  uploadMessageAttachment.single('attachment'),
  validate(messageValidation.sendDirectMessage),
  messageController.sendDirectMessage
);

/**
 * @swagger
 * /api/v1/messages/team/{teamId}:
 *   get:
 *     summary: Get team messages
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
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
 *         description: Messages retrieved
 */
router.get(
  '/team/:teamId',
  protect,
  messageController.getTeamMessages
);

/**
 * @swagger
 * /api/v1/messages/team/{teamId}:
 *   post:
 *     summary: Send message to team
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               attachment:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Message sent
 */
router.post(
  '/team/:teamId',
  protect,
  uploadMessageAttachment.single('attachment'),
  validate(messageValidation.sendTeamMessage),
  messageController.sendTeamMessage
);

/**
 * @swagger
 * /api/v1/messages/{id}/read:
 *   put:
 *     summary: Mark message as read
 *     tags: [Messages]
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
 *         description: Message marked as read
 */
router.put(
  '/:id/read',
  protect,
  messageController.markAsRead
);

/**
 * @swagger
 * /api/v1/messages/conversation/{conversationId}/read:
 *   put:
 *     summary: Mark all messages in conversation as read
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversationType
 *             properties:
 *               conversationType:
 *                 type: string
 *                 enum: [direct, team]
 *     responses:
 *       200:
 *         description: Messages marked as read
 */
router.put(
  '/conversation/:conversationId/read',
  protect,
  messageController.markAsRead // Use existing markAsRead, can handle conversationId via params
);

/**
 * @swagger
 * /api/v1/messages/{id}:
 *   delete:
 *     summary: Delete message (sender only)
 *     tags: [Messages]
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
 *         description: Message deleted
 */
router.delete(
  '/:id',
  protect,
  messageController.deleteMessage
);

/**
 * @swagger
 * /api/v1/messages/search:
 *   get:
 *     summary: Search messages
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: conversationType
 *         schema:
 *           type: string
 *           enum: [direct, team]
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
 *         description: Search results
 */
router.get(
  '/search',
  protect,
  validate(messageValidation.searchMessages),
  messageController.searchMessages
);

/**
 * @swagger
 * /api/v1/messages/unread/count:
 *   get:
 *     summary: Get unread message count
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count returned
 */
router.get(
  '/unread/count',
  protect,
  messageController.getUnreadCount
);

module.exports = router;
