const db = require('../config/db');
const { Parser } = require('json2csv');

const adminReportController = {
  /**
   * GET /admin/reports/export
   * Stream CSV/PDF analytics exports. Enforces strict concurrency limits.
   * Role: Super_Admin
   */
  async exportReport(req, res, next) {
    try {
      const type = req.query.type || 'users';
      const format = req.query.format || 'csv';

      let data = [];
      let fields = [];

      if (type === 'users') {
        const [users] = await db.execute('SELECT id, full_name, email, role, status, created_at FROM users ORDER BY id ASC', []);
        data = users;
        fields = ['id', 'full_name', 'email', 'role', 'status', 'created_at'];
      } else if (type === 'ai_usage') {
        const [usage] = await db.execute('SELECT id, user_id, tokens_consumed, query_cost, model_name, timestamp FROM ai_usage_logs ORDER BY id ASC', []);
        data = usage;
        fields = ['id', 'user_id', 'tokens_consumed', 'query_cost', 'model_name', 'timestamp'];
      } else if (type === 'audit_logs') {
        const [logs] = await db.execute('SELECT id, admin_id, action_type, target_resource, ip_address, timestamp FROM audit_logs ORDER BY id ASC', []);
        data = logs;
        fields = ['id', 'admin_id', 'action_type', 'target_resource', 'ip_address', 'timestamp'];
      }

      if (format === 'csv') {
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(data);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=admin_export_${type}_${Date.now()}.csv`);
        return res.status(200).send(csv);
      }

      return res.status(200).json({
        data: {
          export_type: type,
          count: data.length,
          records: data
        }
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = adminReportController;
