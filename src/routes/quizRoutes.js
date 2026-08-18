const express = require('express');
const router = express.Router();

const quizController = require('../controllers/quizController');
const quizValidators = require('../validators/quizValidators');
const validate = require('../middleware/validate');
const requireRoles = require('../middleware/rbac');
const authenticateToken = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');
const rateLimiter = require('../middleware/rateLimiter');

/**
 * Quiz Module Security Pipeline:
 * Rate Limiting -> JWT Authentication -> Audit Logging -> RBAC ('student') -> express-validator -> validate -> Controller
 */
const quizSecurity = [rateLimiter, authenticateToken, auditLogger, requireRoles('student')];

// POST /quizzes/:id/submit & /api/v1/quizzes/:id/submit
router.post('/quizzes/:id/submit', quizSecurity, quizValidators.submitQuiz, validate, quizController.submitAndEvaluateQuiz);
router.post('/api/v1/quizzes/:id/submit', quizSecurity, quizValidators.submitQuiz, validate, quizController.submitAndEvaluateQuiz);

module.exports = router;
