const express = require('express');
const router = express.Router();
const { userController } = require('../controllers');
const { validate } = require('../middleware/validateMiddleware');
const { userValidation } = require('../validations');
const { protect } = require('../middleware/authMiddleware');
const { uploadProfile } = require('../middleware/uploadMiddleware');


router.put(
  '/profile',
  protect,
  validate(userValidation.updateProfile),
  userController.updateProfile
);


router.put(
  '/profile/picture',
  protect,
  uploadProfile.single('profilePicture'),
  userController.updateProfilePicture
);


router.delete(
  '/profile/picture',
  protect,
  userController.deleteProfilePicture
);


router.get(
  '/bookmarks',
  protect,
  userController.getUserBookmarks
);


router.get(
  '/looking-for-team',
  protect,
  userController.getUsersLookingForTeam
);


router.put(
  '/notifications/settings',
  protect,
  validate(userValidation.updateNotificationSettings),
  userController.updateNotificationSettings
);


router.delete(
  '/account',
  protect,
  userController.deactivateAccount
);


router.get(
  '/activity',
  protect,
  userController.getUserActivity
);


router.get(
  '/engagement-score',
  protect,
  userController.getEngagementScore
);


router.get(
  '/:id',
  protect,
  userController.getUserById
);


router.get(
  '/:id/teams',
  protect,
  userController.getUserTeams
);


router.get(
  '/:id/requests',
  protect,
  userController.getUserRequests
);


router.get(
  '/:id/resources',
  protect,
  userController.getUserResources
);

module.exports = router;
