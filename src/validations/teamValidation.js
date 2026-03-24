const Joi = require('joi');

// Custom ObjectId validation
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).messages({
  'string.pattern.base': 'Invalid ID format',
});

/**
 * Create team validation schema
 */
const createTeamSchema = Joi.object({
  teamName: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.min': 'Team name must be at least 2 characters',
      'string.max': 'Team name cannot exceed 100 characters',
      'any.required': 'Team name is required',
    }),
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
  description: Joi.string()
    .max(500)
    .allow('')
    .trim()
    .messages({
      'string.max': 'Description cannot exceed 500 characters',
    }),
  techStack: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(20)
    .default([])
    .messages({
      'array.max': 'Cannot have more than 20 technologies in tech stack',
    }),
  maxMembers: Joi.number()
    .integer()
    .min(2)
    .max(10)
    .default(4)
    .messages({
      'number.min': 'Team must have at least 2 members capacity',
      'number.max': 'Team cannot have more than 10 members',
    }),
});

/**
 * Update team validation schema
 */
const updateTeamSchema = Joi.object({
  teamName: Joi.string()
    .min(2)
    .max(100)
    .trim(),
  description: Joi.string()
    .max(500)
    .allow('')
    .trim(),
  techStack: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(20),
  maxMembers: Joi.number()
    .integer()
    .min(2)
    .max(10),
  projectUrl: Joi.string()
    .uri()
    .allow('')
    .messages({
      'string.uri': 'Invalid project URL',
    }),
  status: Joi.string()
    .valid('forming', 'formed', 'competing', 'completed'),
  achievements: Joi.array()
    .items(Joi.string().trim().max(100))
    .max(10),
});

/**
 * Invite member validation schema
 */
const inviteMemberSchema = Joi.object({
  userId: objectId
    .required()
    .messages({
      'string.pattern.base': 'Invalid user ID',
      'any.required': 'User ID is required',
    }),
  role: Joi.string()
    .max(50)
    .trim()
    .default('Member')
    .messages({
      'string.max': 'Role cannot exceed 50 characters',
    }),
});

/**
 * Respond to invitation validation schema
 */
const respondInvitationSchema = Joi.object({
  accept: Joi.boolean()
    .required()
    .messages({
      'any.required': 'Accept/decline decision is required',
    }),
});

/**
 * Update member role validation schema
 */
const updateMemberRoleSchema = Joi.object({
  role: Joi.string()
    .max(50)
    .trim()
    .required()
    .messages({
      'string.max': 'Role cannot exceed 50 characters',
      'any.required': 'Role is required',
    }),
});

/**
 * Team query parameters validation schema
 */
const teamQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  hackathonId: objectId,
  status: Joi.string().valid('forming', 'formed', 'competing', 'completed'),
  search: Joi.string().trim().max(200),
  sort: Joi.string().valid(
    'createdAt', '-createdAt',
    'teamName', '-teamName'
  ).default('-createdAt'),
});

module.exports = {
  createTeamSchema,
  updateTeamSchema,
  inviteMemberSchema,
  respondInvitationSchema,
  updateMemberRoleSchema,
  teamQuerySchema,
};
