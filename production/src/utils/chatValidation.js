const Joi = require("joi");

const sendMessageSchema = Joi.object({
  text: Joi.string()
    .required()
    .trim()
    .min(1)
    .max(2000)
    .messages({
      "string.empty": "Message cannot be empty",
      "string.max": "Message cannot exceed 2000 characters",
      "any.required": "Message text is required",
    }),
});

module.exports = {
  sendMessageSchema,
};
