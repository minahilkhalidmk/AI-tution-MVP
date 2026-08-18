const auditService = require('../services/auditService');

const adminAuditController = {
  /**
   * GET /admin/audit-logs
   * Immutable, append-only history of administrative actions.
   * Role: Super_Admin
   */
  async getAuditLogs(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;

      const logs = await auditService.getAuditLogs(page, limit);

      return res.status(200).json({
        data: {
          audit_logs: logs,
          pagination: {
            page,
            limit
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = adminAuditController;
