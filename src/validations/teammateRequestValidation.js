const Joi = require('joi');

// Custom ObjectId validation
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).messages({
  'string.pattern.base': 'Invalid ID format',
});

/**
 * Create teammate request validation schema
 */
const createTeammateRequestSchema = Joi.object({
  hackathonId: objectId
    .messages({
      'string.pattern.base': 'Invalid hackathon ID',
    }),
  customHackathonName: Joi.string()
    .min(3)
    .max(200)
    .trim()
    .when('hackathonId', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required().messages({
        'any.required': 'Either hackathonId or customHackathonName is required',
      }),
    }),
  title: Joi.string()
    .min(10)
    .max(200)
    .trim()
    .required()
    .messages({
      'string.min': 'Title must be at least 10 characters',
      'string.max': 'Title cannot exceed 200 characters',
      'any.required': 'Title is required',
    }),
  description: Joi.string()
    .min(50)
    .max(1000)
    .required()
    .messages({
      'string.min': 'Description must be at least 50 characters',
      'string.max': 'Description cannot exceed 1000 characters',
      'any.required': 'Description is required',
    }),
  requiredSkills: Joi.array()
    .items(Joi.string().trim().max(50))
    .min(1)
    .max(15)
    .required()
    .messages({
      'array.min': 'At least one required skill is needed',
      'array.max': 'Cannot have more than 15 required skills',
      'any.required': 'Required skills are required',
    }),
  preferredSkills: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(15)
    .default([])
    .messages({
      'array.max': 'Cannot have more than 15 preferred skills',
    }),
  teamSizeNeeded: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .required()
    .messages({
      'number.min': 'Team size must be at least 1',
      'number.max': 'Team size cannot exceed 10',
      'any.required': 'Team size needed is required',
    }),
  experienceLevel: Joi.string()
    .valid('beginner', 'intermediate', 'advanced', 'any')
    .default('any')
    .messages({
      'any.only': 'Invalid experience level',
    }),
  deadline: Joi.date()
    .min('now')
    .messages({
      'date.min': 'Deadline must be in the future',
    }),
});

/**
 * Update teammate request validation schema
 */
const updateTeammateRequestSchema = Joi.object({
  title: Joi.string()
    .min(10)
    .max(200)
    .trim(),
  description: Joi.string()
    .min(50)
    .max(1000),
  requiredSkills: Joi.array()
    .items(Joi.string().trim().max(50))
    .min(1)
    .max(15),
  preferredSkills: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(15),
  teamSizeNeeded: Joi.number()
    .integer()
    .min(1)
    .max(10),
  experienceLevel: Joi.string()
    .valid('beginner', 'intermediate', 'advanced', 'any'),
  deadline: Joi.date()
    .min('now'),
});

/**
 * Express interest validation schema
 */
const expressInterestSchema = Joi.object({
  message: Joi.string()
    .max(500)
    .allow('')
    .trim()
    .messages({
      'string.max': 'Message cannot exceed 500 characters',
    }),
});

/**
 * Update status validation schema
 */
const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('open', 'closed', 'completed')
    .required()
    .messages({
      'any.only': 'Status must be open, closed, or completed',
      'any.required': 'Status is required',
    }),
});

/**
 * Teammate request query parameters validation schema
 */
const teammateRequestQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  hackathonId: objectId,
  skills: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ),
  experienceLevel: Joi.string().valid('beginner', 'intermediate', 'advanced', 'any'),
  status: Joi.string().valid('open', 'closed', 'completed').default('open'),
  sort: Joi.string().valid(
    'createdAt', '-createdAt',
    'deadline', '-deadline',
    'viewCount', '-viewCount'
  ).default('-createdAt'),
  search: Joi.string().trim().max(200),
});

module.exports = {
  createTeammateRequestSchema,
  updateTeammateRequestSchema,
  expressInterestSchema,
  updateStatusSchema,
  teammateRequestQuerySchema,
};
