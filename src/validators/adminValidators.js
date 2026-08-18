const { body, param, query } = require('express-validator');

const validRoles = ['student', 'tutor', 'parent', 'Super_Admin'];
const validStatuses = ['active', 'suspended', 'banned'];

const adminValidators = {
  // GET /admin/users
  getUsers: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('role').optional().isIn(validRoles).withMessage(`Role must be one of: ${validRoles.join(', ')}`),
    query('search').optional().isString().trim().escape()
  ],

  // POST /admin/users
  createUser: [
    body('full_name').notEmpty().withMessage('Full name is required').isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 characters'),
    body('email').notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email format').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('role').notEmpty().withMessage('Role is required').isIn(validRoles).withMessage(`Role must be one of: ${validRoles.join(', ')}`)
  ],

  // PUT /admin/users/:id
  updateUser: [
    param('id').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
    body('full_name').notEmpty().withMessage('Full name is required').isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 characters'),
    body('email').notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email format').normalizeEmail(),
    body('role').notEmpty().withMessage('Role is required').isIn(validRoles).withMessage(`Role must be one of: ${validRoles.join(', ')}`)
  ],

  // PATCH /admin/users/:id/status
  updateUserStatus: [
    param('id').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
    body('status').notEmpty().withMessage('Status is required').isIn(validStatuses).withMessage(`Status must be one of: ${validStatuses.join(', ')}`)
  ],

  // GET & DELETE /admin/users/:id/sessions
  userSessionParam: [
    param('id').isInt({ min: 1 }).withMessage('User ID must be a positive integer')
  ],

  // PUT /admin/ai/prompts/:id
  updateAiPrompt: [
    param('id').isInt({ min: 1 }).withMessage('Prompt ID must be a positive integer'),
    body('title').notEmpty().withMessage('Title is required').isLength({ min: 3, max: 255 }).withMessage('Title must be 3-255 characters'),
    body('system_prompt').notEmpty().withMessage('System prompt content is required'),
    body('learning_guardrails').optional().isString()
  ],

  // GET /admin/moderation/flagged
  getFlaggedModeration: [
    query('status').optional().isIn(['pending', 'reviewed', 'dismissed']).withMessage('Status must be pending, reviewed, or dismissed'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],

  // GET /admin/audit-logs
  getAuditLogs: [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],

  // GET /admin/reports/export
  exportReport: [
    query('format').optional().isIn(['csv', 'pdf', 'json']).withMessage('Format must be csv, pdf, or json'),
    query('type').optional().isIn(['users', 'ai_usage', 'audit_logs']).withMessage('Type must be users, ai_usage, or audit_logs')
  ]
};

module.exports = adminValidators;
