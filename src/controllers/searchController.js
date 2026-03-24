const { SearchService } = require('../services');
const { ApiResponse, asyncHandler } = require('../utils');

/**
 * @desc    Global search across all entities
 * @route   GET /api/v1/search
 * @access  Public
 */
const globalSearch = asyncHandler(async (req, res) => {
  const { q, limit = 5 } = req.query;

  const results = await SearchService.globalSearch(q, { limit: parseInt(limit) });

  res.json(
    new ApiResponse(200, results, 'Search completed successfully')
  );
});

/**
 * @desc    Get search suggestions (autocomplete)
 * @route   GET /api/v1/search/suggestions
 * @access  Public
 */
const getSearchSuggestions = asyncHandler(async (req, res) => {
  const { q, type = 'all' } = req.query;

  const suggestions = await SearchService.getSearchSuggestions(q, type);

  res.json(
    new ApiResponse(200, { suggestions }, 'Suggestions retrieved successfully')
  );
});

/**
 * @desc    Search hackathons
 * @route   GET /api/v1/search/hackathons
 * @access  Public
 */
const searchHackathons = asyncHandler(async (req, res) => {
  const {
    q,
    mode,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    sortBy = 'startDate',
    sortOrder = 'asc',
  } = req.query;

  const result = await SearchService.searchHackathons({
    query: q,
    mode,
    status,
    startDate,
    endDate,
    page: parseInt(page),
    limit: parseInt(limit),
    sortBy,
    sortOrder,
  });

  res.json(
    new ApiResponse(200, result, 'Hackathons search completed')
  );
});

/**
 * @desc    Search teammate requests
 * @route   GET /api/v1/search/requests
 * @access  Public
 */
const searchRequests = asyncHandler(async (req, res) => {
  const {
    q,
    skills,
    hackathon,
    college,
    roleNeeded,
    experienceLevel,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const skillsArray = skills ? (Array.isArray(skills) ? skills : skills.split(',')) : undefined;

  const result = await SearchService.searchTeammateRequests({
    query: q,
    skills: skillsArray,
    hackathon,
    college,
    roleNeeded,
    experienceLevel,
    page: parseInt(page),
    limit: parseInt(limit),
    sortBy,
    sortOrder,
  });

  res.json(
    new ApiResponse(200, result, 'Teammate requests search completed')
  );
});

/**
 * @desc    Search resources
 * @route   GET /api/v1/search/resources
 * @access  Public
 */
const searchResources = asyncHandler(async (req, res) => {
  const {
    q,
    type,
    category,
    tags,
    difficulty,
    page = 1,
    limit = 10,
    sortBy = 'voteCount',
    sortOrder = 'desc',
  } = req.query;

  const tagsArray = tags ? (Array.isArray(tags) ? tags : tags.split(',')) : undefined;

  const result = await SearchService.searchResources({
    query: q,
    type,
    category,
    tags: tagsArray,
    difficulty,
    page: parseInt(page),
    limit: parseInt(limit),
    sortBy,
    sortOrder,
  });

  res.json(
    new ApiResponse(200, result, 'Resources search completed')
  );
});

/**
 * @desc    Search users
 * @route   GET /api/v1/search/users
 * @access  Private
 */
const searchUsers = asyncHandler(async (req, res) => {
  const {
    q,
    skills,
    college,
    lookingForTeam,
    experienceLevel,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const skillsArray = skills ? (Array.isArray(skills) ? skills : skills.split(',')) : undefined;

  const result = await SearchService.searchUsers({
    query: q,
    skills: skillsArray,
    college,
    lookingForTeam: lookingForTeam === 'true',
    experienceLevel,
    page: parseInt(page),
    limit: parseInt(limit),
    sortBy,
    sortOrder,
  });

  res.json(
    new ApiResponse(200, result, 'Users search completed')
  );
});

/**
 * @desc    Search teams
 * @route   GET /api/v1/search/teams
 * @access  Private
 */
const searchTeams = asyncHandler(async (req, res) => {
  const {
    q,
    hackathon,
    lookingForMembers,
    skills,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const skillsArray = skills ? (Array.isArray(skills) ? skills : skills.split(',')) : undefined;

  const result = await SearchService.searchTeams({
    query: q,
    hackathon,
    lookingForMembers: lookingForMembers === 'true',
    skills: skillsArray,
    page: parseInt(page),
    limit: parseInt(limit),
    sortBy,
    sortOrder,
  });

  res.json(
    new ApiResponse(200, result, 'Teams search completed')
  );
});

module.exports = {
  globalSearch,
  getSearchSuggestions,
  searchHackathons,
  searchRequests,
  searchResources,
  searchUsers,
  searchTeams,
};
