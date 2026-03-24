const Joi = require('joi');

// Custom ObjectId validation
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).messages({
  'string.pattern.base': 'Invalid ID format',
});

/**
 * Create resource validation schema
 */
const createResourceSchema = Joi.object({
  title: Joi.string()
    .min(3)
    .max(200)
    .trim()
    .required()
    .messages({
      'string.min': 'Title must be at least 3 characters',
      'string.max': 'Title cannot exceed 200 characters',
      'any.required': 'Title is required',
    }),
  description: Joi.string()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.min': 'Description must be at least 10 characters',
      'string.max': 'Description cannot exceed 1000 characters',
      'any.required': 'Description is required',
    }),
  resourceType: Joi.string()
    .valid('code', 'design', 'documentation', 'tutorial', 'other')
    .required()
    .messages({
      'any.only': 'Invalid resource type',
      'any.required': 'Resource type is required',
    }),
  category: Joi.string()
    .valid('web-dev', 'mobile', 'ai-ml', 'design', 'devops', 'other')
    .default('other')
    .messages({
      'any.only': 'Invalid category',
    }),
  externalUrl: Joi.string()
    .uri()
    .allow('')
    .messages({
      'string.uri': 'Invalid URL format',
    }),
  tags: Joi.array()
    .items(Joi.string().trim().max(30))
    .max(10)
    .default([])
    .messages({
      'array.max': 'Cannot have more than 10 tags',
    }),
});

/**
 * Update resource validation schema
 */
const updateResourceSchema = Joi.object({
  title: Joi.string()
    .min(3)
    .max(200)
    .trim(),
  description: Joi.string()
    .min(10)
    .max(1000),
  resourceType: Joi.string()
    .valid('code', 'design', 'documentation', 'tutorial', 'other'),
  category: Joi.string()
    .valid('web-dev', 'mobile', 'ai-ml', 'design', 'devops', 'other'),
  externalUrl: Joi.string()
    .uri()
    .allow(''),
  tags: Joi.array()
    .items(Joi.string().trim().max(30))
    .max(10),
  isActive: Joi.boolean(),
});

/**
 * Vote validation schema
 */
const voteSchema = Joi.object({
  vote: Joi.number()
    .valid(1, -1)
    .required()
    .messages({
      'any.only': 'Vote must be 1 (upvote) or -1 (downvote)',
      'any.required': 'Vote value is required',
    }),
});

/**
 * Add comment validation schema
 */
const addCommentSchema = Joi.object({
  content: Joi.string()
    .min(1)
    .max(500)
    .trim()
    .required()
    .messages({
      'string.min': 'Comment cannot be empty',
      'string.max': 'Comment cannot exceed 500 characters',
      'any.required': 'Comment content is required',
    }),
});

/**
 * Resource query parameters validation schema
 */
const resourceQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  resourceType: Joi.string().valid('code', 'design', 'documentation', 'tutorial', 'other'),
  category: Joi.string().valid('web-dev', 'mobile', 'ai-ml', 'design', 'devops', 'other'),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ),
  search: Joi.string().trim().max(200),
  sort: Joi.string().valid(
    'createdAt', '-createdAt',
    'upvotes', '-upvotes',
    'viewCount', '-viewCount',
    'downloadCount', '-downloadCount',
    'popular'
  ).default('-createdAt'),
});

module.exports = {
  createResourceSchema,
  updateResourceSchema,
  voteSchema,
  addCommentSchema,
  resourceQuerySchema,
};
