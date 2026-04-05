const Joi = require("joi");

const schemas = {
  // Auth validation schemas
  registerSendOtp: Joi.object({
    email: Joi.string()
      .email()
      .lowercase()
      .required()
      .messages({
        "string.email": "Please provide a valid email address",
        "any.required": "Email is required",
      }),
  }),

  registerVerifyOtp: Joi.object({
    email: Joi.string().email().lowercase().required(),
    otp: Joi.string()
      .length(6)
      .pattern(/^\d+$/)
      .required()
      .messages({
        "string.length": "OTP must be 6 digits",
        "string.pattern.base": "OTP must contain only numbers",
        "any.required": "OTP is required",
      }),
    password: Joi.string()
      .min(8)
      .required()
      .messages({
        "string.min": "Password must be at least 8 characters",
        "any.required": "Password is required",
      }),
    confirmPassword: Joi.string()
      .valid(Joi.ref("password"))
      .required()
      .messages({
        "any.only": "Passwords do not match",
        "any.required": "Confirm password is required",
      }),
  }),

  login: Joi.object({
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().required(),
  }),

  changePassword: Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string()
      .min(8)
      .required()
      .messages({
        "string.min": "New password must be at least 8 characters",
      }),
    confirmPassword: Joi.string()
      .valid(Joi.ref("newPassword"))
      .required()
      .messages({
        "any.only": "Passwords do not match",
      }),
  }),

  forgotPasswordSendOtp: Joi.object({
    email: Joi.string().email().lowercase().required(),
  }),

  forgotPasswordVerifyOtp: Joi.object({
    email: Joi.string().email().lowercase().required(),
    otp: Joi.string()
      .length(6)
      .pattern(/^\d+$/)
      .required(),
    newPassword: Joi.string()
      .min(8)
      .required(),
    confirmPassword: Joi.string()
      .valid(Joi.ref("newPassword"))
      .required()
      .messages({
        "any.only": "Passwords do not match",
      }),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};

module.exports = {schemas};
