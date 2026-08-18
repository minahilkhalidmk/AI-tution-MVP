const { validationResult } = require('express-validator');

/**
 * Input Validation Middleware
 * Evaluates express-validator schemas and outputs standard REST error response
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedDetails = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg
    }));

    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload or parameters.',
        details: formattedDetails
      }
    });
  }
  next();
};

module.exports = validate;
