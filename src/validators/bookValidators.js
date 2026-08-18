const { body } = require('express-validator');

/**
 * Book Module Input Validation Schemas
 */
const bookValidators = {
  // POST /api/v1/books
  uploadBook: [
    body('title')
      .exists({ checkFalsy: true })
      .withMessage('title field is required.')
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('title must be between 1 and 255 characters.'),
    body('subject')
      .exists({ checkFalsy: true })
      .withMessage('subject field is required.')
      .isString()
      .trim(),
    body('pages')
      .isArray({ min: 1 })
      .withMessage('pages must be a non-empty array of page texts.')
  ]
};

module.exports = bookValidators;
