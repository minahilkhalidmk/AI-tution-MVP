const { body, query } = require('express-validator');

/**
 * Diary Module Input Validation Schemas
 */
const diaryValidators = {
  // POST /api/v1/diary
  createDiaryEntry: [
    body('title')
      .exists({ checkFalsy: true })
      .withMessage('title field is required.')
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('title must be between 1 and 255 characters.'),
    body('test_date')
      .exists({ checkFalsy: true })
      .withMessage('test_date field is required.')
      .isISO8601()
      .withMessage('test_date must be a valid ISO8601 date string (YYYY-MM-DD).'),
    body('book_id')
      .isInt({ min: 1 })
      .withMessage('book_id must be a positive integer.')
      .toInt(),
    body('syllabus_start_page')
      .isInt({ min: 1 })
      .withMessage('syllabus_start_page must be a positive integer.')
      .toInt(),
    body('syllabus_end_page')
      .isInt({ min: 1 })
      .withMessage('syllabus_end_page must be a positive integer.')
      .toInt()
  ],

  // GET /api/v1/diary
  getDiaryEntries: [
    query('student_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('student_id query parameter must be a positive integer.')
      .toInt()
  ]
};

module.exports = diaryValidators;
