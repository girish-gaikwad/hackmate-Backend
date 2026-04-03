const express = require('express');
const router = express.Router();
const { hackathonController } = require('../controllers');
const { validate } = require('../middleware/validateMiddleware');
const { hackathonValidation } = require('../validations');
const { protect, admin, optionalAuth } = require('../middleware/authMiddleware');


router.get(
  '/',
  hackathonController.getHackathons
);


router.get(
  '/upcoming',
  hackathonController.getUpcomingHackathons
);


router.get(
  '/ongoing',
  hackathonController.getOngoingHackathons
);


router.get(
  '/past',
  hackathonController.getPastHackathons
);


router.get(
  '/featured',
  hackathonController.getFeaturedHackathons
);


router.get(
  '/source/:source',
  hackathonController.getHackathonsBySource
);


router.post(
  '/',
  protect,
  admin,
  validate(hackathonValidation.createHackathon),
  hackathonController.createHackathon
);


router.get(
  '/:idOrSlug',
  optionalAuth,
  hackathonController.getHackathon
);


router.put(
  '/:id',
  protect,
  admin,
  validate(hackathonValidation.updateHackathon),
  hackathonController.updateHackathon
);


router.delete(
  '/:id',
  protect,
  admin,
  hackathonController.deleteHackathon
);


router.post(
  '/:id/bookmark',
  protect,
  hackathonController.toggleBookmark
);


router.get(
  '/:id/bookmark',
  protect,
  hackathonController.checkBookmark
);


router.get(
  '/:id/stats',
  hackathonController.getHackathonStats
);

module.exports = router;
