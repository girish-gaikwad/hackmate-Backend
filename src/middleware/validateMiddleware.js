const { ApiError } = require('../utils');

/**
 * Validate request against Joi schema(s)
 * @param {Object} schema - Joi validation schema OR object with body/query/params schemas
 * @param {string} property - Property to validate ('body', 'query', 'params') - only used if schema is a direct Joi schema
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    // Check if schema is an object containing body/query/params schemas
    // This handles the format: { body: Joi.object(...), query: Joi.object(...) }
    if (schema && typeof schema === 'object' && (schema.body || schema.query || schema.params)) {
      const errors = [];

      for (const [prop, propSchema] of Object.entries(schema)) {
        if (propSchema && propSchema.validate && typeof propSchema.validate === 'function') {
          const { error, value } = propSchema.validate(req[prop], {
            abortEarly: false,
            stripUnknown: true,
          });

          if (error) {
            errors.push(...error.details.map((detail) => detail.message));
          } else {
            req[prop] = value;
          }
        }
      }

      if (errors.length > 0) {
        throw ApiError.badRequest(errors.join(', '));
      }

      return next();
    }

    // Handle direct Joi schema (backwards compatibility)
    if (schema && typeof schema.validate === 'function') {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const errorMessages = error.details.map((detail) => detail.message).join(', ');
        throw ApiError.badRequest(errorMessages);
      }

      req[property] = value;
      return next();
    }

    // If schema is invalid, skip validation
    next();
  };
};

/**
 * Validate multiple parts of request
 * @param {Object} schemas - Object containing schemas for body, query, params
 */
const validateMultiple = (schemas) => {
  return (req, res, next) => {
    const errors = [];

    for (const [property, schema] of Object.entries(schemas)) {
      if (schema && req[property]) {
        const { error, value } = schema.validate(req[property], {
          abortEarly: false,
          stripUnknown: true,
        });

        if (error) {
          errors.push(...error.details.map((detail) => detail.message));
        } else {
          req[property] = value;
        }
      }
    }

    if (errors.length > 0) {
      throw ApiError.badRequest(errors.join(', '));
    }

    next();
  };
};

module.exports = {
  validate,
  validateMultiple,
};
