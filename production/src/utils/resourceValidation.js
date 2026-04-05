const joi = require("joi");

const schemas = {
  createResource: joi.object({
    title: joi.string().max(160).required(),
    description: joi.string().max(2000).allow("").optional(),
    url: joi.string().uri().allow("").optional(),
    tags: joi.array().items(joi.string().trim().max(40)).optional(),
  }),
  updateResource: joi.object({
    title: joi.string().max(160).optional(),
    description: joi.string().max(2000).allow("").optional(),
    url: joi.string().uri().allow("").optional(),
    tags: joi.array().items(joi.string().trim().max(40)).optional(),
  }),
  addComment: joi.object({
    text: joi.string().trim().max(500).required(),
  }),
};

module.exports = {
  schemas,
};
