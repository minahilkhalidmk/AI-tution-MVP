const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const authValidators = require('../middlewares/validators/authValidators');
const validate = require('../middleware/validate');
const authenticateToken = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

/**
 * Authentication Module Routes & Security Pipeline
 */
// 1. POST /register & /auth/register
router.post('/register', rateLimiter, authValidators.register, validate, authController.register);
router.post('/auth/register', rateLimiter, authValidators.register, validate, authController.register);

// 2. POST /login & /auth/login
router.post('/login', rateLimiter, authValidators.login, validate, authController.login);
router.post('/auth/login', rateLimiter, authValidators.login, validate, authController.login);

// 3. POST /refresh & /auth/refresh
router.post('/refresh', rateLimiter, authValidators.refresh, validate, authController.refresh);
router.post('/auth/refresh', rateLimiter, authValidators.refresh, validate, authController.refresh);

// 4. POST /logout & /auth/logout
router.post('/logout', rateLimiter, authenticateToken, authController.logout);
router.post('/auth/logout', rateLimiter, authenticateToken, authController.logout);

// 5. POST /forgot-password & /auth/forgot-password
router.post('/forgot-password', rateLimiter, authValidators.forgotPassword, validate, authController.forgotPassword);
router.post('/auth/forgot-password', rateLimiter, authValidators.forgotPassword, validate, authController.forgotPassword);

// 6. POST /reset-password & /auth/reset-password
router.post('/reset-password', rateLimiter, authValidators.resetPassword, validate, authController.resetPassword);
router.post('/auth/reset-password', rateLimiter, authValidators.resetPassword, validate, authController.resetPassword);

// 7. GET /me & /auth/me
router.get('/me', rateLimiter, authenticateToken, authController.getMe);
router.get('/auth/me', rateLimiter, authenticateToken, authController.getMe);

module.exports = router;
