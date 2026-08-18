const express = require('express');
const router = express.Router();
const adminSessionController = require('../../controllers/adminSessionController');
const adminValidators = require('../../validators/adminValidators');
const validate = require('../../middleware/validate');
const requireRoles = require('../../middleware/rbac');

// GET /admin/users/:id/sessions - Super_Admin
router.get('/:id/sessions', requireRoles('Super_Admin'), adminValidators.userSessionParam, validate, adminSessionController.getUserSessions);

// DELETE /admin/users/:id/sessions - Super_Admin
router.delete('/:id/sessions', requireRoles('Super_Admin'), adminValidators.userSessionParam, validate, adminSessionController.revokeUserSessions);

module.exports = router;
