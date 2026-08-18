const { body, param, query } = require('express-validator');

/**
 * Teacher Module Input Validation Schemas
 * Enforces strict type, format, and boundary checks on all request params, body, and query strings.
 */
const teacherValidators = {
  // GET /api/v1/teachers/dashboard
  getDashboard: [],

  // GET /api/v1/teachers/classes
  getClasses: [],

  // GET /api/v1/teachers/students
  // Optional query parameter ?grade={integer}
  getStudents: [
    query('grade')
      .optional()
      .isInt({ min: 1, max: 12 })
      .withMessage('Grade filter must be an integer between 1 and 12.')
      .toInt()
  ],

  // GET /api/v1/teachers/homework-status
  getHomeworkStatus: [],

  // PUT /api/v1/tasks/:id/grade
  // Validation: id must be an integer. Body must contain new_grade (float) and reason (string, max 255 chars).
  gradeTask: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Task ID parameter must be a positive integer.')
      .toInt(),
    body('new_grade')
      .exists({ checkNull: true })
      .withMessage('new_grade field is required.')
      .isFloat({ min: 0, max: 100 })
      .withMessage('new_grade must be a valid float between 0.00 and 100.00.')
      .toFloat(),
    body('reason')
      .exists({ checkFalsy: true })
      .withMessage('reason field is required.')
      .isString()
      .withMessage('reason must be a valid string.')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('reason cannot be empty and must not exceed 255 characters.')
  ],

  // POST /api/v1/teachers/assign-quiz
  // Validation: Body must contain class_id (integer) and quiz_title (string).
  assignQuiz: [
    body('class_id')
      .exists({ checkNull: true })
      .withMessage('class_id field is required.')
      .isInt({ min: 1 })
      .withMessage('class_id must be a positive integer.')
      .toInt(),
    body('quiz_title')
      .exists({ checkFalsy: true })
      .withMessage('quiz_title field is required.')
      .isString()
      .withMessage('quiz_title must be a valid string.')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('quiz_title cannot be empty and must not exceed 255 characters.')
  ]
};

module.exports = teacherValidators;
