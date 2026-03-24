const Joi = require('joi');

/**
 * Update profile validation schema
 */
const updateProfileSchema = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(50)
    .trim()
    .messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name cannot exceed 50 characters',
    }),
  lastName: Joi.string()
    .min(2)
    .max(50)
    .trim()
    .messages({
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name cannot exceed 50 characters',
    }),
  graduationYear: Joi.number()
    .integer()
    .min(2020)
    .max(2035)
    .messages({
      'number.min': 'Invalid graduation year',
      'number.max': 'Invalid graduation year',
    }),
  major: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .messages({
      'string.min': 'Major must be at least 2 characters',
      'string.max': 'Major cannot exceed 100 characters',
    }),
  bio: Joi.string()
    .max(500)
    .allow('')
    .trim()
    .messages({
      'string.max': 'Bio cannot exceed 500 characters',
    }),
  skills: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(20)
    .messages({
      'array.max': 'Cannot have more than 20 skills',
    }),
  socialLinks: Joi.object({
    github: Joi.string()
      .uri()
      .allow('')
      .pattern(/^(https?:\/\/)?(www\.)?github\.com\/[\w-]+\/?$|^$/)
      .messages({
        'string.pattern.base': 'Invalid GitHub URL',
      }),
    linkedin: Joi.string()
      .uri()
      .allow('')
      .pattern(/^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[\w-]+\/?$|^$/)
      .messages({
        'string.pattern.base': 'Invalid LinkedIn URL',
      }),
    portfolio: Joi.string()
      .uri()
      .allow('')
      .messages({
        'string.uri': 'Invalid portfolio URL',
      }),
  }),
});

/**
 * Update preferences validation schema
 */
const updatePreferencesSchema = Joi.object({
  emailNotifications: Joi.boolean(),
  pushNotifications: Joi.boolean(),
  theme: Joi.string()
    .valid('light', 'dark', 'system')
    .messages({
      'any.only': 'Theme must be light, dark, or system',
    }),
});

/**
 * User query parameters validation schema
 */
const userQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  skills: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string()),
      Joi.string()
    ),
  graduationYear: Joi.number().integer().min(2020).max(2035),
  major: Joi.string().trim(),
  search: Joi.string().trim().max(100),
  sort: Joi.string().valid('createdAt', '-createdAt', 'firstName', '-firstName', 'reputation', '-reputation'),
});

module.exports = {
  updateProfileSchema,
  updatePreferencesSchema,
  userQuerySchema,
};
