const express = require('express');
const router = express.Router();
const adminReportController = require('../../controllers/adminReportController');
const adminValidators = require('../../validators/adminValidators');
const validate = require('../../middleware/validate');
const requireRoles = require('../../middleware/rbac');
const concurrencyLimiter = require('../../middleware/concurrencyLimiter');

// GET /admin/reports/export - Super_Admin (with Event Loop Concurrency Limiter)
router.get('/export', requireRoles('Super_Admin'), concurrencyLimiter(2), adminValidators.exportReport, validate, adminReportController.exportReport);

module.exports = router;
