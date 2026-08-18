const express = require('express');
const router = express.Router();
const adminAiController = require('../../controllers/adminAiController');
const adminValidators = require('../../validators/adminValidators');
const validate = require('../../middleware/validate');
const requireRoles = require('../../middleware/rbac');

// GET /admin/ai/usage - Super_Admin
router.get('/usage', requireRoles('Super_Admin'), adminAiController.getAiUsage);

// PUT /admin/ai/prompts/:id - Super_Admin
router.put('/prompts/:id', requireRoles('Super_Admin'), adminValidators.updateAiPrompt, validate, adminAiController.updateAiPrompt);

module.exports = router;
