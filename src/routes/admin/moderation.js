const express = require('express');
const router = express.Router();
const adminModerationController = require('../../controllers/adminModerationController');
const adminValidators = require('../../validators/adminValidators');
const validate = require('../../middleware/validate');
const requireRoles = require('../../middleware/rbac');

// GET /admin/moderation/flagged - Super_Admin
router.get('/flagged', requireRoles('Super_Admin'), adminValidators.getFlaggedModeration, validate, adminModerationController.getFlaggedModeration);

module.exports = router;
