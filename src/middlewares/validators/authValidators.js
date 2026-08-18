const { body } = require('express-validator');

/**
 * express-validator schemas for Authentication Module endpoints
 */
const authValidators = {
  register: [
    body('full_name')
      .trim()
      .notEmpty()
      .withMessage('Full name is required.'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Valid email address is required.')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long.'),
    body('role')
      .optional()
      .isIn(['Super_Admin', 'Support_Admin', 'AI_Manager', 'tutor', 'parent', 'student'])
      .withMessage('Invalid user role specified.'),
    body('account_type')
      .optional()
      .isIn(['institutional', 'private'])
      .withMessage('Invalid account_type. Must be institutional or private.')
  ],

  login: [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Valid email address is required.'),
    body('password')
      .notEmpty()
      .withMessage('Password is required.')
  ],

  refresh: [
    body('refresh_token')
      .optional()
      .isString()
      .withMessage('Refresh token must be a string.')
  ],

  forgotPassword: [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Valid email address is required.')
  ],

  resetPassword: [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required.'),
    body('password')
      .optional()
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long.'),
    body('new_password')
      .optional()
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long.')
  ]
};

module.exports = authValidators;
