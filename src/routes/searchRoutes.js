const express = require('express');
const router = express.Router();
const { searchController } = require('../controllers');
const { optionalAuth } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/v1/search:
 *   get:
 *     summary: Global search across all entities
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, users, hackathons, teams, teammates, resources]
 *         description: Entity type to search
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Results per page
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Missing search query
 */
router.get(
  '/',
  optionalAuth,
  searchController.globalSearch
);

/**
 * @swagger
 * /api/v1/search/suggestions:
 *   get:
 *     summary: Get search suggestions/autocomplete
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Partial search query
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, users, hackathons, teams, teammates, resources]
 *         description: Entity type for suggestions
 *     responses:
 *       200:
 *         description: Search suggestions
 */
router.get(
  '/suggestions',
  optionalAuth,
  searchController.getSearchSuggestions
);

/**
 * @swagger
 * /api/v1/search/users:
 *   get:
 *     summary: Search users
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *         description: Comma-separated skills to filter by
 *       - in: query
 *         name: college
 *         schema:
 *           type: string
 *         description: College name filter
 *       - in: query
 *         name: lookingForTeam
 *         schema:
 *           type: boolean
 *         description: Filter users looking for team
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
 *         description: User search results
 */
router.get(
  '/users',
  optionalAuth,
  searchController.searchUsers
);

/**
 * @swagger
 * /api/v1/search/hackathons:
 *   get:
 *     summary: Search hackathons
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: mode
 *         schema:
 *           type: string
 *           enum: [online, in-person, hybrid]
 *         description: Hackathon mode filter
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [upcoming, ongoing, past]
 *         description: Status filter
 *       - in: query
 *         name: themes
 *         schema:
 *           type: string
 *         description: Comma-separated themes to filter by
 *       - in: query
 *         name: minPrize
 *         schema:
 *           type: number
 *         description: Minimum prize pool
 *       - in: query
 *         name: maxPrize
 *         schema:
 *           type: number
 *         description: Maximum prize pool
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
 *         description: Hackathon search results
 */
router.get(
  '/hackathons',
  optionalAuth,
  searchController.searchHackathons
);

/**
 * @swagger
 * /api/v1/search/teams:
 *   get:
 *     summary: Search teams
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: hackathon
 *         schema:
 *           type: string
 *         description: Hackathon ID filter
 *       - in: query
 *         name: isRecruiting
 *         schema:
 *           type: boolean
 *         description: Filter teams that are recruiting
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *         description: Required skills to filter by
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
 *         description: Team search results
 */
router.get(
  '/teams',
  optionalAuth,
  searchController.searchTeams
);

/**
 * @swagger
 * /api/v1/search/teammate-requests:
 *   get:
 *     summary: Search teammate requests
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: hackathon
 *         schema:
 *           type: string
 *         description: Hackathon ID filter
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *         description: Required skills filter
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, closed, fulfilled]
 *         description: Request status filter
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
 *         description: Teammate request search results
 */
router.get(
  '/teammate-requests',
  optionalAuth,
  searchController.searchRequests
);

/**
 * @swagger
 * /api/v1/search/resources:
 *   get:
 *     summary: Search resources
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [tutorial, tool, template, article, video, course, other]
 *         description: Resource type filter
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category filter
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated tags to filter by
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
 *         description: Resource search results
 */
router.get(
  '/resources',
  optionalAuth,
  searchController.searchResources
);

module.exports = router;
