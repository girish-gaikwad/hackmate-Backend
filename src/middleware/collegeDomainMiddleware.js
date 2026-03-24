const { CollegeDomain } = require('../models');
const { ApiError, asyncHandler, extractDomain } = require('../utils');

/**
 * Verify college domain from email during registration
 */
const verifyCollegeDomain = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    throw ApiError.badRequest('Email is required');
  }

  const domain = extractDomain(email);

  if (!domain) {
    throw ApiError.badRequest('Invalid email format');
  }

  // Check if domain is registered and active
  const collegeDomain = await CollegeDomain.verifyDomain(domain);

  if (!collegeDomain) {
    throw ApiError.badRequest(
      'Your college email domain is not registered. Please contact support to add your college.'
    );
  }

  // Attach college info to request
  req.collegeDomain = domain;
  req.collegeName = collegeDomain.collegeName;

  next();
});

/**
 * Extract and attach college domain from authenticated user
 */
const attachCollegeDomain = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized('User not authenticated');
  }

  req.collegeDomain = req.user.collegeDomain;
  req.collegeName = req.user.collegeName;

  next();
});

/**
 * Verify user belongs to the same college (for college-specific resources)
 */
const sameCollegeOnly = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized('User not authenticated');
  }

  // Attach college domain filter for queries
  req.collegeFilter = { collegeDomain: req.user.collegeDomain };

  next();
});

/**
 * Check if a specific domain is valid
 * @param {string} domain - Domain to check
 * @returns {Promise<boolean>}
 */
const isValidCollegeDomain = async (domain) => {
  const collegeDomain = await CollegeDomain.verifyDomain(domain);
  return !!collegeDomain;
};

/**
 * Get college name from domain
 * @param {string} domain - Domain to lookup
 * @returns {Promise<string|null>}
 */
const getCollegeName = async (domain) => {
  const collegeDomain = await CollegeDomain.findOne({ domain: domain.toLowerCase() });
  return collegeDomain ? collegeDomain.collegeName : null;
};

module.exports = {
  verifyCollegeDomain,
  attachCollegeDomain,
  sameCollegeOnly,
  isValidCollegeDomain,
  getCollegeName,
};
