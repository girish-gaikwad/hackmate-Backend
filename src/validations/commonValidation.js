const Joi = require('joi');

// Custom ObjectId validation
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).messages({
  'string.pattern.base': 'Invalid ID format',
});

/**
 * Create bookmark validation schema
 */
const createBookmarkSchema = Joi.object({
  hackathonId: objectId
    .required()
    .messages({
      'string.pattern.base': 'Invalid hackathon ID',
      'any.required': 'Hackathon ID is required',
    }),
  notificationsEnabled: Joi.boolean()
    .default(true),
});

/**
 * Update bookmark validation schema
 */
const updateBookmarkSchema = Joi.object({
  notificationsEnabled: Joi.boolean()
    .required()
    .messages({
      'any.required': 'Notifications enabled status is required',
    }),
});

/**
 * Bookmark query parameters validation schema
 */
const bookmarkQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('upcoming', 'ongoing', 'ended'),
  sort: Joi.string().valid(
    'createdAt', '-createdAt'
  ).default('-createdAt'),
});

/**
 * Send message validation schema
 */
const sendMessageSchema = Joi.object({
  receiverId: objectId
    .required()
    .messages({
      'string.pattern.base': 'Invalid receiver ID',
      'any.required': 'Receiver ID is required',
    }),
  content: Joi.string()
    .min(1)
    .max(2000)
    .trim()
    .required()
    .messages({
      'string.min': 'Message cannot be empty',
      'string.max': 'Message cannot exceed 2000 characters',
      'any.required': 'Message content is required',
    }),
  messageType: Joi.string()
    .valid('text', 'file', 'hackathon-link')
    .default('text'),
  hackathonId: objectId
    .when('messageType', {
      is: 'hackathon-link',
      then: Joi.required().messages({
        'any.required': 'Hackathon ID is required for hackathon-link messages',
      }),
    }),
});

/**
 * Message query parameters validation schema
 */
const messageQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

/**
 * Notification query parameters validation schema
 */
const notificationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  isRead: Joi.boolean(),
});

/**
 * Contact form validation schema
 */
const contactFormSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'any.required': 'Name is required',
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required',
    }),
  subject: Joi.string()
    .min(5)
    .max(200)
    .trim()
    .required()
    .messages({
      'string.min': 'Subject must be at least 5 characters',
      'any.required': 'Subject is required',
    }),
  message: Joi.string()
    .min(20)
    .max(2000)
    .required()
    .messages({
      'string.min': 'Message must be at least 20 characters',
      'any.required': 'Message is required',
    }),
});

module.exports = {
  createBookmarkSchema,
  updateBookmarkSchema,
  bookmarkQuerySchema,
  sendMessageSchema,
  messageQuerySchema,
  notificationQuerySchema,
  contactFormSchema,
};
