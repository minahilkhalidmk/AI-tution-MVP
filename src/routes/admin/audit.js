const express = require('express');
const router = express.Router();
const adminAuditController = require('../../controllers/adminAuditController');
const adminValidators = require('../../validators/adminValidators');
const validate = require('../../middleware/validate');
const requireRoles = require('../../middleware/rbac');

// GET /admin/audit-logs - Super_Admin
router.get('/', requireRoles('Super_Admin'), adminValidators.getAuditLogs, validate, adminAuditController.getAuditLogs);

module.exports = router;
