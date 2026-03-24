const { protect, optionalAuth, verifiedOnly, restrictTo, sameCollegeOnly } = require('./authMiddleware');
const { errorHandler, notFound } = require('./errorMiddleware');
const { validate, validateMultiple } = require('./validateMiddleware');
const { generalLimiter, authLimiter, passwordResetLimiter, uploadLimiter, searchLimiter, createLimiter } = require('./rateLimitMiddleware');
const { uploadProfilePicture, uploadResource, uploadMessageAttachment, handleUploadError } = require('./uploadMiddleware');
const { verifyCollegeDomain, attachCollegeDomain } = require('./collegeDomainMiddleware');
const { checkOwnership, checkCreator, checkCollegeAccess, checkTeamMember, checkTeamCreator } = require('./ownershipMiddleware');

module.exports = {
  // Auth middleware
  protect,
  optionalAuth,
  verifiedOnly,
  restrictTo,
  sameCollegeOnly,
  
  // Error handling
  errorHandler,
  notFound,
  
  // Validation
  validate,
  validateMultiple,
  
  // Rate limiting
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  uploadLimiter,
  searchLimiter,
  createLimiter,
  
  // File uploads
  uploadProfilePicture,
  uploadResource,
  uploadMessageAttachment,
  handleUploadError,
  
  // College domain
  verifyCollegeDomain,
  attachCollegeDomain,
  
  // Ownership
  checkOwnership,
  checkCreator,
  checkCollegeAccess,
  checkTeamMember,
  checkTeamCreator,
};
