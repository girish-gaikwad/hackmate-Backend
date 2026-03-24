const Joi = require('joi');

// Custom ObjectId validation
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).messages({
  'string.pattern.base': 'Invalid ID format',
});

/**
 * Create hackathon validation schema
 */
const createHackathonSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(200)
    .trim()
    .required()
    .messages({
      'string.min': 'Name must be at least 3 characters',
      'string.max': 'Name cannot exceed 200 characters',
      'any.required': 'Name is required',
    }),
  description: Joi.string()
    .min(50)
    .max(5000)
    .required()
    .messages({
      'string.min': 'Description must be at least 50 characters',
      'string.max': 'Description cannot exceed 5000 characters',
      'any.required': 'Description is required',
    }),
  platformSource: Joi.string()
    .valid('devpost', 'mlh', 'hackerearth', 'hackathon.com', 'manual', 'other')
    .required()
    .messages({
      'any.only': 'Invalid platform source',
      'any.required': 'Platform source is required',
    }),
  startDate: Joi.date()
    .required()
    .messages({
      'any.required': 'Start date is required',
    }),
  endDate: Joi.date()
    .greater(Joi.ref('startDate'))
    .required()
    .messages({
      'date.greater': 'End date must be after start date',
      'any.required': 'End date is required',
    }),
  registrationDeadline: Joi.date()
    .max(Joi.ref('startDate'))
    .messages({
      'date.max': 'Registration deadline must be before or on start date',
    }),
  prizePool: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.min': 'Prize pool cannot be negative',
    }),
  prizeCurrency: Joi.string()
    .length(3)
    .uppercase()
    .default('USD'),
  themes: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(10)
    .default([]),
  eligibility: Joi.string()
    .valid('students-only', 'open-to-all', 'professionals', 'specific')
    .default('open-to-all'),
  locationType: Joi.string()
    .valid('online', 'in-person', 'hybrid')
    .default('online'),
  location: Joi.object({
    city: Joi.string().trim().max(100),
    country: Joi.string().trim().max(100),
    venue: Joi.string().trim().max(200),
  }),
  externalUrl: Joi.string()
    .uri()
    .required()
    .messages({
      'string.uri': 'Invalid URL format',
      'any.required': 'External URL is required',
    }),
  imageUrl: Joi.string()
    .uri()
    .allow('')
    .messages({
      'string.uri': 'Invalid image URL format',
    }),
  organizerName: Joi.string()
    .trim()
    .max(200),
  organizerLogo: Joi.string()
    .uri()
    .allow(''),
  schedule: Joi.array()
    .items(
      Joi.object({
        title: Joi.string().trim().max(200),
        datetime: Joi.date(),
        description: Joi.string().trim().max(500),
      })
    )
    .max(20),
  prizes: Joi.array()
    .items(
      Joi.object({
        position: Joi.string().trim().max(100),
        amount: Joi.number().min(0),
        description: Joi.string().trim().max(500),
      })
    )
    .max(20),
  sponsors: Joi.array()
    .items(Joi.string().trim().max(100))
    .max(30),
  tags: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(20),
});

/**
 * Update hackathon validation schema
 */
const updateHackathonSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(200)
    .trim(),
  description: Joi.string()
    .min(50)
    .max(5000),
  startDate: Joi.date(),
  endDate: Joi.date(),
  registrationDeadline: Joi.date(),
  prizePool: Joi.number().min(0),
  prizeCurrency: Joi.string().length(3).uppercase(),
  themes: Joi.array().items(Joi.string().trim().max(50)).max(10),
  eligibility: Joi.string().valid('students-only', 'open-to-all', 'professionals', 'specific'),
  locationType: Joi.string().valid('online', 'in-person', 'hybrid'),
  location: Joi.object({
    city: Joi.string().trim().max(100),
    country: Joi.string().trim().max(100),
    venue: Joi.string().trim().max(200),
  }),
  externalUrl: Joi.string().uri(),
  imageUrl: Joi.string().uri().allow(''),
  organizerName: Joi.string().trim().max(200),
  organizerLogo: Joi.string().uri().allow(''),
  schedule: Joi.array().items(
    Joi.object({
      title: Joi.string().trim().max(200),
      datetime: Joi.date(),
      description: Joi.string().trim().max(500),
    })
  ).max(20),
  prizes: Joi.array().items(
    Joi.object({
      position: Joi.string().trim().max(100),
      amount: Joi.number().min(0),
      description: Joi.string().trim().max(500),
    })
  ).max(20),
  sponsors: Joi.array().items(Joi.string().trim().max(100)).max(30),
  tags: Joi.array().items(Joi.string().trim().max(50)).max(20),
  isActive: Joi.boolean(),
});

/**
 * Hackathon query parameters validation schema
 */
const hackathonQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('upcoming', 'ongoing', 'ended'),
  platform: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ),
  theme: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ),
  prizeMin: Joi.number().min(0),
  prizeMax: Joi.number().min(0),
  startDate: Joi.date(),
  endDate: Joi.date(),
  location: Joi.string().valid('online', 'in-person', 'hybrid'),
  search: Joi.string().trim().max(200),
  sort: Joi.string().valid(
    'startDate', '-startDate',
    'prizePool', '-prizePool',
    'createdAt', '-createdAt',
    'bookmarkCount', '-bookmarkCount'
  ).default('-startDate'),
});

/**
 * Search hackathon validation schema
 */
const searchHackathonSchema = Joi.object({
  q: Joi.string()
    .min(2)
    .max(200)
    .trim()
    .required()
    .messages({
      'string.min': 'Search query must be at least 2 characters',
      'any.required': 'Search query is required',
    }),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

module.exports = {
  createHackathonSchema,
  updateHackathonSchema,
  hackathonQuerySchema,
  searchHackathonSchema,
};
