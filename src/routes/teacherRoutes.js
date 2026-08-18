const express = require('express');
const router = express.Router();

const teacherController = require('../controllers/teacherController');
const teacherValidators = require('../validators/teacherValidators');
const validate = require('../middleware/validate');
const requireRoles = require('../middleware/rbac');
const authenticateToken = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');
const rateLimiter = require('../middleware/rateLimiter');

/**
 * Teacher Module Security Middleware Pipeline:
 * Rate Limiting -> JWT Authentication -> Audit Logging -> RBAC ('tutor') -> express-validator -> validate -> Controller
 */
const teacherSecurity = [rateLimiter, authenticateToken, auditLogger, requireRoles('tutor')];

// 1. GET /teachers/dashboard & /api/v1/teachers/dashboard
router.get('/teachers/dashboard', teacherSecurity, teacherValidators.getDashboard, validate, teacherController.getDashboard);
router.get('/api/v1/teachers/dashboard', teacherSecurity, teacherValidators.getDashboard, validate, teacherController.getDashboard);

// 2. GET /teachers/classes & /api/v1/teachers/classes
router.get('/teachers/classes', teacherSecurity, teacherValidators.getClasses, validate, teacherController.getClasses);
router.get('/api/v1/teachers/classes', teacherSecurity, teacherValidators.getClasses, validate, teacherController.getClasses);

// 3. GET /teachers/students & /api/v1/teachers/students
router.get('/teachers/students', teacherSecurity, teacherValidators.getStudents, validate, teacherController.getStudents);
router.get('/api/v1/teachers/students', teacherSecurity, teacherValidators.getStudents, validate, teacherController.getStudents);

// 4. GET /teachers/homework-status & /api/v1/teachers/homework-status
router.get('/teachers/homework-status', teacherSecurity, teacherValidators.getHomeworkStatus, validate, teacherController.getHomeworkStatus);
router.get('/api/v1/teachers/homework-status', teacherSecurity, teacherValidators.getHomeworkStatus, validate, teacherController.getHomeworkStatus);

// 5. POST /teachers/assign-quiz & /api/v1/teachers/assign-quiz
router.post('/teachers/assign-quiz', teacherSecurity, teacherValidators.assignQuiz, validate, teacherController.assignQuiz);
router.post('/api/v1/teachers/assign-quiz', teacherSecurity, teacherValidators.assignQuiz, validate, teacherController.assignQuiz);

// 6. PUT /tasks/:id/grade & /api/v1/tasks/:id/grade
router.put('/tasks/:id/grade', teacherSecurity, teacherValidators.gradeTask, validate, teacherController.gradeTask);
router.put('/api/v1/tasks/:id/grade', teacherSecurity, teacherValidators.gradeTask, validate, teacherController.gradeTask);

module.exports = router;
