/**
 * Authorization Middleware (RBAC)
 * Verifies Role-Based Access Control
 * Usage: requireRoles('Super_Admin')
 */
const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'User authentication required.',
          details: []
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN_ROLE',
          message: `Access denied. Action requires one of the following roles: [${allowedRoles.join(', ')}]. Required role is missing.`,
          details: []
        }
      });
    }

    next();
  };
};

module.exports = requireRoles;
