const db = require('../config/db');

class AuditService {
  /**
   * Insert immutable audit record into audit_logs table
   */
  async logAction({ adminId, actionType, targetResource, payloadDelta, ipAddress }) {
    try {
      const sql = `
        INSERT INTO audit_logs (admin_id, action_type, target_resource, payload_delta, ip_address, timestamp)
        VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())
      `;
      const deltaJson = payloadDelta ? JSON.stringify(payloadDelta) : null;
      await db.execute(sql, [adminId, actionType, targetResource, deltaJson, ipAddress || '127.0.0.1']);
    } catch (err) {
      console.error('[AuditService] Failed to write audit log:', err.message);
    }
  }

  /**
   * Retrieve audit logs (paginated)
   */
  async getAuditLogs(page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const sql = `
      SELECT a.id, a.admin_id, u.full_name as admin_name, u.email as admin_email,
             a.action_type, a.target_resource, a.payload_delta, a.ip_address, a.timestamp
      FROM audit_logs a
      LEFT JOIN users u ON a.admin_id = u.id
      ORDER BY a.timestamp DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await db.execute(sql, [Number(limit), Number(offset)]);
    return rows.map(r => ({
      ...r,
      payload_delta: typeof r.payload_delta === 'string' ? JSON.parse(r.payload_delta) : r.payload_delta
    }));
  }
}

module.exports = new AuditService();
