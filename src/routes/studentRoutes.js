const express = require('express');
const router = express.Router();

const studentController = require('../controllers/studentController');
const quizController = require('../controllers/quizController');
const studentValidators = require('../validators/studentValidators');
const quizValidators = require('../validators/quizValidators');
const validate = require('../middleware/validate');
const requireRoles = require('../middleware/rbac');
const authenticateToken = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');
const rateLimiter = require('../middleware/rateLimiter');

/**
 * Student Module Security Middleware Pipeline:
 * Rate Limiting -> JWT Authentication -> Audit Logging -> RBAC ('student') -> express-validator -> validate -> Controller
 */
const studentSecurity = [rateLimiter, authenticateToken, auditLogger, requireRoles('student')];

// 1. GET /students/dashboard
router.get('/students/dashboard', studentSecurity, studentValidators.getDashboard, validate, studentController.getDashboard);
router.get('/api/v1/students/dashboard', studentSecurity, studentValidators.getDashboard, validate, studentController.getDashboard);

// 2. GET /homework
router.get('/homework', studentSecurity, studentValidators.getHomework, validate, studentController.getHomework);
router.get('/api/v1/homework', studentSecurity, studentValidators.getHomework, validate, studentController.getHomework);

// 3. GET /homework/:id/tasks
router.get('/homework/:id/tasks', studentSecurity, studentValidators.getHomeworkTasks, validate, studentController.getHomeworkTasks);
router.get('/api/v1/homework/:id/tasks', studentSecurity, studentValidators.getHomeworkTasks, validate, studentController.getHomeworkTasks);

// 4. GET /tasks/current
router.get('/tasks/current', studentSecurity, studentValidators.getCurrentTask, validate, studentController.getCurrentTask);
router.get('/api/v1/tasks/current', studentSecurity, studentValidators.getCurrentTask, validate, studentController.getCurrentTask);

// 5. POST /tasks/:id/attempt
router.post('/tasks/:id/attempt', studentSecurity, studentValidators.attemptTask, validate, studentController.attemptTask);
router.post('/api/v1/tasks/:id/attempt', studentSecurity, studentValidators.attemptTask, validate, studentController.attemptTask);

// 6. POST /chat/sessions
router.post('/chat/sessions', studentSecurity, studentValidators.createChatSession, validate, studentController.createChatSession);
router.post('/api/v1/chat/sessions', studentSecurity, studentValidators.createChatSession, validate, studentController.createChatSession);

// 7. POST /chat/sessions/:id/messages
router.post('/chat/sessions/:id/messages', studentSecurity, studentValidators.sendChatMessage, validate, studentController.sendChatMessage);
router.post('/api/v1/chat/sessions/:id/messages', studentSecurity, studentValidators.sendChatMessage, validate, studentController.sendChatMessage);

// 8. GET /quizzes
router.get('/quizzes', studentSecurity, studentValidators.getQuizzes, validate, studentController.getQuizzes);
router.get('/api/v1/quizzes', studentSecurity, studentValidators.getQuizzes, validate, studentController.getQuizzes);

// 9. POST /quizzes/:id/submit -> All-in-One Quiz Submission & Server-Side Evaluation
router.post('/quizzes/:id/submit', studentSecurity, quizValidators.submitQuiz, validate, quizController.submitAndEvaluateQuiz);
router.post('/api/v1/quizzes/:id/submit', studentSecurity, quizValidators.submitQuiz, validate, quizController.submitAndEvaluateQuiz);

module.exports = router;
