const express = require('express');
const router = express.Router();

const diaryController = require('../controllers/diaryController');
const diaryValidators = require('../validators/diaryValidators');
const validate = require('../middleware/validate');
const requireRoles = require('../middleware/rbac');
const authenticateToken = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');
const rateLimiter = require('../middleware/rateLimiter');

/**
 * Diary Module Routes & Security Pipeline
 */
const diaryCreateSecurity = [rateLimiter, authenticateToken, auditLogger, requireRoles('student')];
const diaryReadSecurity = [rateLimiter, authenticateToken, auditLogger, requireRoles('student', 'parent')];

// POST /diary & /api/v1/diary (Create test diary entry & trigger AI quiz generation)
router.post('/diary', diaryCreateSecurity, diaryValidators.createDiaryEntry, validate, diaryController.createDiaryEntry);
router.post('/api/v1/diary', diaryCreateSecurity, diaryValidators.createDiaryEntry, validate, diaryController.createDiaryEntry);

// GET /diary & /api/v1/diary (Get scheduled test diary entries)
router.get('/diary', diaryReadSecurity, diaryValidators.getDiaryEntries, validate, diaryController.getDiaryEntries);
router.get('/api/v1/diary', diaryReadSecurity, diaryValidators.getDiaryEntries, validate, diaryController.getDiaryEntries);

module.exports = router;
