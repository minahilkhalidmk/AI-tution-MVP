const express = require('express');
const router = express.Router();
const multer = require('multer');

const parentController = require('../controllers/parentController');
const parentValidators = require('../middlewares/validators/parentValidators');
const validate = require('../middleware/validate');
const requireRoles = require('../middleware/rbac');
const authenticateToken = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const { assertParentChildLink } = require('../middlewares/ownership');

// Multer in-memory upload storage for PDF textbook processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB
});

/**
 * Parent Module Routes & Security Pipeline
 * Rate Limiting -> JWT Authentication -> RBAC ('parent') -> IDOR Ownership Check -> express-validator -> Controller
 */

// 1. GET /parents/children & /api/v1/parents/children
router.get('/parents/children', rateLimiter, authenticateToken, requireRoles('parent'), parentController.getChildren);
router.get('/api/v1/parents/children', rateLimiter, authenticateToken, requireRoles('parent'), parentController.getChildren);

// 2. POST /parents/children & /api/v1/parents/children
router.post('/parents/children', rateLimiter, authenticateToken, requireRoles('parent'), parentValidators.linkChild, validate, parentController.linkChild);
router.post('/api/v1/parents/children', rateLimiter, authenticateToken, requireRoles('parent'), parentValidators.linkChild, validate, parentController.linkChild);

// 3. POST /parents/books & /api/v1/parents/books (PDF Book Upload)
router.post('/parents/books', rateLimiter, authenticateToken, requireRoles('parent'), upload.single('file'), parentValidators.uploadBook, validate, parentController.uploadBook);
router.post('/api/v1/parents/books', rateLimiter, authenticateToken, requireRoles('parent'), upload.single('file'), parentValidators.uploadBook, validate, parentController.uploadBook);

// 4. POST /diaries/upload & /parents/diaries (Create Pending Diary Entry)
router.post('/diaries/upload', rateLimiter, authenticateToken, requireRoles('parent'), assertParentChildLink, parentValidators.uploadDiary, validate, parentController.uploadDiaryEntry);
router.post('/parents/diaries', rateLimiter, authenticateToken, requireRoles('parent'), assertParentChildLink, parentValidators.uploadDiary, validate, parentController.uploadDiaryEntry);
router.post('/api/v1/diaries/upload', rateLimiter, authenticateToken, requireRoles('parent'), assertParentChildLink, parentValidators.uploadDiary, validate, parentController.uploadDiaryEntry);

// 5. PUT /diaries/:id/confirm (Confirm Diary Entry & Trigger Async AI Quiz Service)
router.put('/diaries/:id/confirm', rateLimiter, authenticateToken, requireRoles('parent'), parentValidators.confirmDiary, validate, parentController.confirmDiaryEntry);
router.put('/parents/diaries/:id/confirm', rateLimiter, authenticateToken, requireRoles('parent'), parentValidators.confirmDiary, validate, parentController.confirmDiaryEntry);
router.put('/api/v1/diaries/:id/confirm', rateLimiter, authenticateToken, requireRoles('parent'), parentValidators.confirmDiary, validate, parentController.confirmDiaryEntry);

// 6. GET /reports & /parents/reports (Child Progress Analytics)
router.get('/reports', rateLimiter, authenticateToken, requireRoles('parent'), assertParentChildLink, parentValidators.queryStudentId, validate, parentController.getChildReports);
router.get('/parents/reports', rateLimiter, authenticateToken, requireRoles('parent'), assertParentChildLink, parentValidators.queryStudentId, validate, parentController.getChildReports);
router.get('/api/v1/reports', rateLimiter, authenticateToken, requireRoles('parent'), assertParentChildLink, parentValidators.queryStudentId, validate, parentController.getChildReports);

// 7. GET /notifications & /api/v1/notifications
router.get('/notifications', rateLimiter, authenticateToken, parentController.getNotifications);
router.get('/api/v1/notifications', rateLimiter, authenticateToken, parentController.getNotifications);

module.exports = router;
