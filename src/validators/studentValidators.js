const { body, param, query } = require('express-validator');

/**
 * Student Module Input Validation Schemas
 * Enforces strict type, boundary, and format sanitization on student request payloads.
 */
const studentValidators = {
  // GET /api/v1/students/dashboard
  getDashboard: [],

  // GET /api/v1/homework
  getHomework: [],

  // GET /api/v1/homework/:id/tasks
  getHomeworkTasks: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Homework ID parameter must be a positive integer.')
      .toInt()
  ],

  // GET /api/v1/tasks/current
  getCurrentTask: [],

  // POST /api/v1/tasks/:id/attempt
  attemptTask: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Task ID parameter must be a positive integer.')
      .toInt(),
    body('answer')
      .exists({ checkFalsy: true })
      .withMessage('answer field is required.')
      .isString()
      .withMessage('answer must be a valid string.')
      .trim()
  ],

  // POST /api/v1/chat/sessions
  createChatSession: [
    body('topic')
      .optional()
      .isString()
      .withMessage('topic must be a valid string.')
      .trim()
      .isLength({ max: 255 })
      .withMessage('topic must not exceed 255 characters.')
  ],

  // POST /api/v1/chat/sessions/:id/messages
  sendChatMessage: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Chat session ID parameter must be a positive integer.')
      .toInt(),
    body('message')
      .exists({ checkFalsy: true })
      .withMessage('message field is required.')
      .isString()
      .withMessage('message must be a valid string.')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('message cannot be empty and must not exceed 1000 characters.')
  ],

  // GET /api/v1/quizzes
  getQuizzes: [],

  // POST /api/v1/quizzes/:id/submit
  submitQuiz: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Quiz ID parameter must be a positive integer.')
      .toInt(),
    body('answers')
      .exists()
      .withMessage('answers field is required.')
  ]
};

module.exports = studentValidators;
