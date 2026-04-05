const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((detail) => detail.message);
      return res.status(400).json({
        statusCode: 400,
        success: false,
        message: "Validation error",
        errors: messages,
      });
    }

    req.body = value;
    next();
  };
};

exports.validateRequest = validateRequest;