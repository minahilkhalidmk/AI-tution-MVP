const express = require('express');
const router = express.Router();

const adminRateLimiter = require('../../middleware/rateLimiter');
const authenticateToken = require('../../middleware/auth');
const auditLogger = require('../../middleware/auditLogger');

// Import Admin Sub-Routers
const userRoutes = require('./users');
const sessionRoutes = require('./sessions');
const aiRoutes = require('./ai');
const moderationRoutes = require('./moderation');
const dashboardRoutes = require('./dashboard');
const auditRoutes = require('./audit');
const reportRoutes = require('./reports');

// Apply Linear Security Defense-in-Depth Pipeline to all /admin/* routes
router.use(adminRateLimiter);
router.use(authenticateToken);
router.use(auditLogger);

// Mount Sub-Routes
router.use('/users', userRoutes);
router.use('/users', sessionRoutes); // Handles /users/:id/sessions
router.use('/ai', aiRoutes);
router.use('/moderation', moderationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/reports', reportRoutes);

module.exports = router;
