const express = require('express');
const router = express.Router();
const { resourceController } = require('../controllers');
const { validate } = require('../middleware/validateMiddleware');
const { resourceValidation } = require('../validations');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { uploadResource } = require('../middleware/uploadMiddleware');


router.get(
  '/',
  resourceController.getResources
);


router.get(
  '/popular',
  resourceController.getPopularResources
);


router.get(
  '/tags',
  resourceController.getResourceTags
);


router.get(
  '/category/:category',
  resourceController.getResourcesByCategory
);


router.get(
  '/type/:type',
  resourceController.getResourcesByType
);


router.post(
  '/',
  protect,
  uploadResource.single('file'),
  validate(resourceValidation.createResource),
  resourceController.createResource
);


router.get(
  '/:id',
  optionalAuth,
  resourceController.getResource
);


router.put(
  '/:id',
  protect,
  uploadResource.single('file'),
  validate(resourceValidation.updateResource),
  resourceController.updateResource
);


router.delete(
  '/:id',
  protect,
  resourceController.deleteResource
);


router.post(
  '/:id/vote',
  protect,
  resourceController.toggleVote
);


router.post(
  '/:id/downvote',
  protect,
  resourceController.toggleDownvote
);


router.post(
  '/:id/comments',
  protect,
  validate(resourceValidation.addComment),
  resourceController.addComment
);


router.delete(
  '/:id/comments/:commentId',
  protect,
  resourceController.deleteComment
);


router.post(
  '/:id/bookmark',
  protect,
  resourceController.toggleBookmark
);

module.exports = router;
