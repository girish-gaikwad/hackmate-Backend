const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { ApiError, asyncHandler } = require('../utils');

/**
 * Protect routes - Verify JWT token and attach user to request
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Get token from Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Or from cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Check if token exists
  if (!token) {
    throw ApiError.unauthorized('Not authorized to access this route');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      throw ApiError.unauthorized('User no longer exists');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token has expired');
    }
    throw error;
  }
});

/**
 * Optional authentication - Attach user if token is valid, but don't require it
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        req.user = user;
      }
    } catch (error) {
      // Token is invalid, but we don't throw an error
      // Just continue without user
    }
  }

  next();
});

/**
 * Verify user email is verified
 */
const verifiedOnly = asyncHandler(async (req, res, next) => {
  if (!req.user.isVerified) {
    throw ApiError.forbidden('Please verify your email to access this resource');
  }
  next();
});

/**
 * Restrict to specific roles
 * @param {...string} roles - Allowed roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden('You do not have permission to perform this action');
    }
    next();
  };
};

/**
 * Check if user owns the resource or is admin
 * @param {Model} Model - Mongoose model
 * @param {string} paramName - URL parameter name for resource ID
 * @param {string} userField - Field in model that references user
 */
const checkOwnership = (Model, paramName = 'id', userField = 'userId') => {
  return asyncHandler(async (req, res, next) => {
    const resourceId = req.params[paramName];
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
      throw ApiError.forbidden('You do not have permission to modify this resource');
    }

    req.resource = resource;
    next();
  });
};

/**
 * Restrict to same college domain
 */
const sameCollegeOnly = asyncHandler(async (req, res, next) => {
  // This middleware should be used after protect middleware
  if (!req.user) {
    throw ApiError.unauthorized('Not authorized');
  }

  // Attach college domain to request for use in controllers
  req.collegeDomain = req.user.collegeDomain;
  next();
});

// Admin-only middleware (convenience function)
const admin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    throw ApiError.forbidden('Admin access required');
  }
  next();
};

module.exports = {
  protect,
  optionalAuth,
  verifiedOnly,
  restrictTo,
  admin,
  checkOwnership,
  sameCollegeOnly,
};
