const { body, param, query } = require('express-validator');

/**
 * express-validator schemas for Parent Module endpoints
 */
const parentValidators = {
  linkChild: [
    body('student_code')
      .trim()
      .isAlphanumeric()
      .withMessage('Student code must be alphanumeric.')
      .isLength({ min: 6, max: 6 })
      .withMessage('Student code must be exactly 6 characters long.')
  ],

  uploadDiary: [
    body('student_id')
      .isInt()
      .withMessage('student_id must be a valid integer ID.'),
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Diary entry title is required.'),
    body('test_date')
      .isISO8601()
      .withMessage('test_date must be a valid YYYY-MM-DD date string.'),
    body('book_id')
      .isInt()
      .withMessage('book_id must be a valid integer ID.'),
    body('syllabus_start_page')
      .isInt({ min: 1 })
      .withMessage('syllabus_start_page must be a positive integer.'),
    body('syllabus_end_page')
      .isInt({ min: 1 })
      .withMessage('syllabus_end_page must be a positive integer.')
  ],

  confirmDiary: [
    param('id')
      .optional()
      .isInt()
      .withMessage('id must be a valid integer.')
  ],

  queryStudentId: [
    query('student_id')
      .optional()
      .isInt()
      .withMessage('student_id query parameter must be a valid integer.')
  ],

  uploadBook: [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Book title is required.'),
    body('subject')
      .trim()
      .notEmpty()
      .withMessage('Subject is required.')
  ]
};

module.exports = parentValidators;
