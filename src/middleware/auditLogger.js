const auditService = require('../services/auditService');

/**
 * Immutable Audit Logging Middleware
 * Automatically captures state-changing HTTP requests (POST, PUT, PATCH, DELETE)
 * and logs admin ID, action type, target resource, payload delta, and IP address.
 */
const auditLogger = (req, res, next) => {
  const isStateChangingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());

  if (isStateChangingMethod) {
    // Intercept res.json to log after successful response (status < 400)
    const originalJson = res.json;

    res.json = function (body) {
      // Execute original json response first
      const result = originalJson.call(this, body);

      // Only audit successful state-changing operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const adminId = req.user ? req.user.id : null;
        if (adminId) {
          const actionType = res.locals.auditAction || `${req.method}_${req.baseUrl.replace(/\/admin\/?/, '').replace(/\//g, '_').toUpperCase()}`;
          const targetResource = res.locals.auditTarget || req.originalUrl;
          const payloadDelta = {
            request_body: req.body,
            request_params: req.params,
            response_summary: res.locals.auditDelta || body
          };
          const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

          // Async audit logging without blocking client response
          auditService.logAction({
            adminId,
            actionType,
            targetResource,
            payloadDelta,
            ipAddress
          }).catch(err => console.error('[AuditLogger] Middleware error:', err));
        }
      }

      return result;
    };
  }

  next();
};

module.exports = auditLogger;
