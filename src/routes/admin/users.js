const express = require('express');
const router = express.Router();
const adminUserController = require('../../controllers/adminUserController');
const adminValidators = require('../../validators/adminValidators');
const validate = require('../../middleware/validate');
const requireRoles = require('../../middleware/rbac');

// GET /admin/users - Super_Admin
router.get('/', requireRoles('Super_Admin'), adminValidators.getUsers, validate, adminUserController.getUsers);

// POST /admin/users - Super_Admin
router.post('/', requireRoles('Super_Admin'), adminValidators.createUser, validate, adminUserController.createUser);

// PUT /admin/users/:id - Super_Admin
router.put('/:id', requireRoles('Super_Admin'), adminValidators.updateUser, validate, adminUserController.updateUser);

// PATCH /admin/users/:id/status - Super_Admin
router.patch('/:id/status', requireRoles('Super_Admin'), adminValidators.updateUserStatus, validate, adminUserController.updateUserStatus);

module.exports = router;
