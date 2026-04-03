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


router.get(
  '/',
  protect,
  bookmarkController.getBookmarks
);


router.get(
  '/hackathons',
  protect,
  bookmarkController.getBookmarkedHackathons
);


router.get(
  '/resources',
  protect,
  bookmarkController.getBookmarkedResources
);


router.post(
  '/hackathons/:hackathonId',
  protect,
  bookmarkController.createHackathonBookmark
);


router.delete(
  '/hackathons/:hackathonId',
  protect,
  bookmarkController.deleteHackathonBookmark
);


router.post(
  '/resources/:resourceId',
  protect,
  bookmarkController.createResourceBookmark
);


router.delete(
  '/resources/:resourceId',
  protect,
  bookmarkController.deleteResourceBookmark
);


router.delete(
  '/:id',
  protect,
  bookmarkController.deleteBookmark
);


router.put(
  '/:id/notification',
  protect,
  bookmarkController.updateBookmarkNotifications
);


router.get(
  '/check/:itemType/:itemId',
  protect,
  bookmarkController.checkBookmark
);

module.exports = router;
