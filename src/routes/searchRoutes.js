const express = require('express');
const router = express.Router();
const { searchController } = require('../controllers');
const { optionalAuth } = require('../middleware/authMiddleware');


router.get(
  '/',
  optionalAuth,
  searchController.globalSearch
);


router.get(
  '/suggestions',
  optionalAuth,
  searchController.getSearchSuggestions
);


router.get(
  '/users',
  optionalAuth,
  searchController.searchUsers
);


router.get(
  '/hackathons',
  optionalAuth,
  searchController.searchHackathons
);


router.get(
  '/teams',
  optionalAuth,
  searchController.searchTeams
);


router.get(
  '/teammate-requests',
  optionalAuth,
  searchController.searchRequests
);


router.get(
  '/resources',
  optionalAuth,
  searchController.searchResources
);

module.exports = router;
