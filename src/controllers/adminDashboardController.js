const db = require('../config/db');

const adminDashboardController = {
  /**
   * GET /admin/dashboard
   * High-level system KPIs (active sessions, total users, flagged items).
   * Roles: Super_Admin
   */
  async getDashboardKpis(req, res, next) {
    try {
      const [userCountRows] = await db.execute('SELECT COUNT(*) as total_users FROM users', []);
      const [sessionCountRows] = await db.execute('SELECT COUNT(*) as active_sessions FROM user_sessions WHERE is_active = 1', []);
      const [flaggedCountRows] = await db.execute('SELECT COUNT(*) as pending_flags FROM flagged_moderations WHERE review_status = "pending"', []);

      const kpis = {
        total_users: userCountRows[0] ? userCountRows[0].total_users : 0,
        active_sessions: sessionCountRows[0] ? sessionCountRows[0].active_sessions : 0,
        pending_safety_flags: flaggedCountRows[0] ? flaggedCountRows[0].pending_flags : 0,
        api_throughput_status: 'HEALTHY',
        server_timestamp: new Date().toISOString()
      };

      return res.status(200).json({
        data: {
          kpis
        }
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = adminDashboardController;
