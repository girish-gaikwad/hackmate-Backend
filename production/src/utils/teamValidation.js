const joi = require("joi");

const schemas = {
  createTeam: joi.object({
    name: joi.string().min(3).max(60).required(),
    description: joi.string().max(1000).allow("").optional(),
    requirements: joi.string().max(1000).allow("").optional(),
    maxMembers: joi.number().integer().min(2).max(10).optional(),
    tags: joi.array().items(joi.string().trim().max(40)).optional(),
    openForRequests: joi.boolean().optional(),
    hackathon: joi
      .object({
        source: joi.string().valid("unstop", "devpost", "other").required(),
        hackathonId: joi.string().required(),
        title: joi.string().required(),
        url: joi.string().uri().optional().allow(null, ""),
        deadlineText: joi.string().optional().allow(null, ""),
      })
      .required(),
  }),
  updateTeam: joi.object({
    name: joi.string().min(3).max(60).optional(),
    description: joi.string().max(1000).allow("").optional(),
    requirements: joi.string().max(1000).allow("").optional(),
    maxMembers: joi.number().integer().min(2).max(10).optional(),
    tags: joi.array().items(joi.string().trim().max(40)).optional(),
    openForRequests: joi.boolean().optional(),
  }),
  sendJoinRequest: joi.object({
    message: joi.string().max(500).allow("").optional(),
  }),
  respondJoinRequest: joi.object({
    action: joi.string().valid("accept", "reject").required(),
  }),
};

module.exports = {
  schemas,
};
