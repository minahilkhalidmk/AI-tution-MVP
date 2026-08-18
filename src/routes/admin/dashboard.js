const express = require('express');
const router = express.Router();
const adminDashboardController = require('../../controllers/adminDashboardController');
const requireRoles = require('../../middleware/rbac');

// GET /admin/dashboard - Super_Admin
router.get('/', requireRoles('Super_Admin'), adminDashboardController.getDashboardKpis);

module.exports = router;
