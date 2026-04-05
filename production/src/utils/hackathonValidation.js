const joi = require("joi");

const schemas = {
  addBookmark: joi.object({
    source: joi.string().valid("unstop", "devpost", "other").required(),
    sourceId: joi.string().required(),
    title: joi.string().required(),
    url: joi.string().uri().allow("").optional(),
    thumbnailUrl: joi.string().uri().allow("").optional(),
    organization: joi.string().allow("").optional(),
  }),
  removeBookmark: joi.object({
    source: joi.string().valid("unstop", "devpost", "other").required(),
    sourceId: joi.string().required(),
  }),
};

module.exports = {
  schemas,
};
