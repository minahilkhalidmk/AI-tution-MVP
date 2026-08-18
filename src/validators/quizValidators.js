const { body, param } = require('express-validator');

/**
 * Quiz Module Input Validation Schemas
 * Strictly validates quiz ID parameter and submitted answers payload structure.
 */
const quizValidators = {
  // POST /api/v1/quizzes/:id/submit
  submitQuiz: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Quiz ID parameter must be a positive integer.')
      .toInt(),
    body('answers')
      .isArray({ min: 1 })
      .withMessage('answers payload must be a non-empty array of objects.'),
    body('answers.*.question_id')
      .isInt({ min: 1 })
      .withMessage('Each answer item must contain a positive integer question_id.')
      .toInt(),
    body('answers.*.selected_option')
      .exists({ checkFalsy: true })
      .withMessage('Each answer item must contain a selected_option string.')
      .isString()
      .withMessage('selected_option must be a valid string.')
      .trim()
      .toUpperCase()
  ]
};

module.exports = quizValidators;
