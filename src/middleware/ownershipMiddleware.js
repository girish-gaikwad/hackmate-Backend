const { ApiError, asyncHandler } = require('../utils');

/**
 * Check ownership of a resource
 * @param {Model} Model - Mongoose model
 * @param {string} paramName - URL parameter name for resource ID
 * @param {string} userField - Field in model that references user
 */
const checkOwnership = (Model, paramName = 'id', userField = 'userId') => {
  return asyncHandler(async (req, res, next) => {
    const resourceId = req.params[paramName];
    
    if (!resourceId) {
      throw ApiError.badRequest('Resource ID is required');
    }

    const resource = await Model.findById(resourceId);

    if (!resource) {
      throw ApiError.notFound('Resource not found');
    }

    // Allow admins to bypass ownership check
    if (req.user.role === 'admin') {
      req.resource = resource;
      return next();
    }

    // Check ownership
    const ownerId = resource[userField];
    if (!ownerId || ownerId.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden('You do not have permission to access this resource');
    }

    // Attach resource to request for use in controller
    req.resource = resource;
    next();
  });
};

/**
 * Check if user is the creator of a resource (using creatorId field)
 * @param {Model} Model - Mongoose model
 * @param {string} paramName - URL parameter name for resource ID
 */
const checkCreator = (Model, paramName = 'id') => {
  return checkOwnership(Model, paramName, 'creatorId');
};

/**
 * Check if user can access a college-specific resource
 * @param {Model} Model - Mongoose model
 * @param {string} paramName - URL parameter name for resource ID
 */
const checkCollegeAccess = (Model, paramName = 'id') => {
  return asyncHandler(async (req, res, next) => {
    const resourceId = req.params[paramName];
    
    if (!resourceId) {
      throw ApiError.badRequest('Resource ID is required');
    }

    const resource = await Model.findById(resourceId);

    if (!resource) {
      throw ApiError.notFound('Resource not found');
    }

    // Allow admins to bypass college check
    if (req.user.role === 'admin') {
      req.resource = resource;
      return next();
    }

    // Check if user belongs to the same college
    if (resource.collegeDomain && resource.collegeDomain !== req.user.collegeDomain) {
      throw ApiError.forbidden('You can only access resources from your college');
    }

    req.resource = resource;
    next();
  });
};

/**
 * Check if user is a team member
 * @param {string} paramName - URL parameter name for team ID
 */
const checkTeamMember = (paramName = 'id') => {
  return asyncHandler(async (req, res, next) => {
    const { Team } = require('../models');
    const teamId = req.params[paramName];

    if (!teamId) {
      throw ApiError.badRequest('Team ID is required');
    }

    const team = await Team.findById(teamId);

    if (!team) {
      throw ApiError.notFound('Team not found');
    }

    // Allow admins to bypass
    if (req.user.role === 'admin') {
      req.team = team;
      return next();
    }

    // Check if user is a member
    const isMember = team.members.some(
      (member) => member.userId.toString() === req.user._id.toString()
    );

    if (!isMember) {
      throw ApiError.forbidden('You are not a member of this team');
    }

    req.team = team;
    next();
  });
};

/**
 * Check if user is the team creator
 * @param {string} paramName - URL parameter name for team ID
 */
const checkTeamCreator = (paramName = 'id') => {
  return asyncHandler(async (req, res, next) => {
    const { Team } = require('../models');
    const teamId = req.params[paramName];

    if (!teamId) {
      throw ApiError.badRequest('Team ID is required');
    }

    const team = await Team.findById(teamId);

    if (!team) {
      throw ApiError.notFound('Team not found');
    }

    // Allow admins to bypass
    if (req.user.role === 'admin') {
      req.team = team;
      return next();
    }

    // Check if user is the creator
    if (team.creatorId.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden('Only the team creator can perform this action');
    }

    req.team = team;
    next();
  });
};

module.exports = {
  checkOwnership,
  checkCreator,
  checkCollegeAccess,
  checkTeamMember,
  checkTeamCreator,
};
