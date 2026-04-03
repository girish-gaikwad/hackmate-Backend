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


router.get(
  '/conversations',
  protect,
  messageController.getConversations
);


router.get(
  '/direct/:userId',
  protect,
  messageController.getDirectMessages
);


router.post(
  '/direct/:userId',
  protect,
  uploadMessageAttachment.single('attachment'),
  validate(messageValidation.sendDirectMessage),
  messageController.sendDirectMessage
);


router.get(
  '/team/:teamId',
  protect,
  messageController.getTeamMessages
);


router.post(
  '/team/:teamId',
  protect,
  uploadMessageAttachment.single('attachment'),
  validate(messageValidation.sendTeamMessage),
  messageController.sendTeamMessage
);


router.put(
  '/:id/read',
  protect,
  messageController.markAsRead
);


router.put(
  '/conversation/:conversationId/read',
  protect,
  messageController.markAsRead // Use existing markAsRead, can handle conversationId via params
);


router.delete(
  '/:id',
  protect,
  messageController.deleteMessage
);


router.get(
  '/search',
  protect,
  validate(messageValidation.searchMessages),
  messageController.searchMessages
);


router.get(
  '/unread/count',
  protect,
  messageController.getUnreadCount
);

module.exports = router;
