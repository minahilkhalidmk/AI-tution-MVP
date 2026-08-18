const express = require('express');
const router = express.Router();

const bookController = require('../controllers/bookController');
const bookValidators = require('../validators/bookValidators');
const validate = require('../middleware/validate');
const requireRoles = require('../middleware/rbac');
const authenticateToken = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');
const rateLimiter = require('../middleware/rateLimiter');

/**
 * Book Module Routes & Security Pipeline
 */
const bookUploadSecurity = [rateLimiter, authenticateToken, auditLogger, requireRoles('Super_Admin', 'tutor', 'parent')];
const bookReadSecurity = [rateLimiter, authenticateToken, auditLogger, requireRoles('Super_Admin', 'tutor', 'parent', 'student')];

// POST /books & /api/v1/books (Upload/Ingest textbook)
router.post('/books', bookUploadSecurity, bookValidators.uploadBook, validate, bookController.uploadBook);
router.post('/api/v1/books', bookUploadSecurity, bookValidators.uploadBook, validate, bookController.uploadBook);

// GET /books & /api/v1/books (List accessible textbooks)
router.get('/books', bookReadSecurity, bookController.getAccessibleBooks);
router.get('/api/v1/books', bookReadSecurity, bookController.getAccessibleBooks);

module.exports = router;
