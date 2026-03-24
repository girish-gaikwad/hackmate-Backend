/**
 * General helper functions
 */

/**
 * Extract domain from email
 * @param {string} email - Email address
 * @returns {string} Domain part of email
 */
const extractDomain = (email) => {
  if (!email || typeof email !== 'string') {
    return null;
  }
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : null;
};

/**
 * Create pagination object
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} totalItems - Total number of items
 * @returns {Object} Pagination object
 */
const createPagination = (page, limit, totalItems) => {
  const totalPages = Math.ceil(totalItems / limit);
  return {
    currentPage: page,
    totalPages,
    totalItems,
    itemsPerPage: limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Build sort object from query string
 * @param {string} sortString - Sort string (e.g., '-createdAt' or 'name,-date')
 * @returns {Object} MongoDB sort object
 */
const buildSortObject = (sortString) => {
  if (!sortString) {
    return { createdAt: -1 };
  }

  const sortObj = {};
  const sortFields = sortString.split(',');

  sortFields.forEach((field) => {
    if (field.startsWith('-')) {
      sortObj[field.substring(1)] = -1;
    } else {
      sortObj[field] = 1;
    }
  });

  return sortObj;
};

/**
 * Filter object to remove undefined/null values
 * @param {Object} obj - Object to filter
 * @returns {Object} Filtered object
 */
const filterObject = (obj) => {
  const filtered = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      filtered[key] = obj[key];
    }
  });
  return filtered;
};

/**
 * Sanitize user object for response (remove sensitive fields)
 * @param {Object} user - User object
 * @returns {Object} Sanitized user object
 */
const sanitizeUser = (user) => {
  if (!user) return null;

  const userObj = user.toObject ? user.toObject() : { ...user };
  
  const sensitiveFields = [
    'password',
    'verificationToken',
    'verificationTokenExpires',
    'passwordResetToken',
    'passwordResetExpires',
    'refreshToken',
    '__v',
  ];

  sensitiveFields.forEach((field) => {
    delete userObj[field];
  });

  return userObj;
};

/**
 * Generate random string
 * @param {number} length - Length of string
 * @returns {string} Random string
 */
const generateRandomString = (length = 32) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

/**
 * Parse array from query string
 * @param {string|string[]} value - Query value
 * @returns {string[]} Array of values
 */
const parseArrayQuery = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value.split(',').map((v) => v.trim()).filter(Boolean);
};

/**
 * Calculate time difference in human readable format
 * @param {Date} date - Date to compare
 * @returns {string} Human readable time difference
 */
const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
};

/**
 * Check if date is in the future
 * @param {Date} date - Date to check
 * @returns {boolean}
 */
const isFutureDate = (date) => {
  return new Date(date) > new Date();
};

/**
 * Check if date is in the past
 * @param {Date} date - Date to check
 * @returns {boolean}
 */
const isPastDate = (date) => {
  return new Date(date) < new Date();
};

/**
 * Format date to string
 * @param {Date} date - Date to format
 * @param {string} format - Format type ('short', 'long', 'iso')
 * @returns {string} Formatted date string
 */
const formatDate = (date, format = 'short') => {
  const d = new Date(date);
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    case 'long':
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    case 'iso':
      return d.toISOString();
    default:
      return d.toLocaleDateString();
  }
};

/**
 * Escape regex special characters
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

module.exports = {
  extractDomain,
  createPagination,
  buildSortObject,
  filterObject,
  sanitizeUser,
  generateRandomString,
  parseArrayQuery,
  timeAgo,
  isFutureDate,
  isPastDate,
  formatDate,
  escapeRegex,
};
