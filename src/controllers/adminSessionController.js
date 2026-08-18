const db = require('../config/db');
const tokenBlocklistService = require('../services/tokenBlocklistService');

const adminSessionController = {
  /**
   * GET /admin/users/:id/sessions
   * Fetch active login sessions across devices with metadata.
   * Roles: Super_Admin
   */
  async getUserSessions(req, res, next) {
    try {
      const userId = parseInt(req.params.id, 10);

      // Verify user exists
      const [userRows] = await db.execute('SELECT id, full_name, email FROM users WHERE id = ?', [userId]);
      if (!userRows[0]) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Target user record not found.',
            details: []
          }
        });
      }

      const sql = `
        SELECT id, session_token, device_platform, device_version, ip_address, user_agent, is_active, created_at, expires_at
        FROM user_sessions
        WHERE user_id = ? AND is_active = 1
        ORDER BY created_at DESC
      `;
      const [sessions] = await db.execute(sql, [userId]);

      return res.status(200).json({
        data: {
          user_id: userId,
          active_sessions: sessions.map(s => ({
            id: s.id,
            device_platform: s.device_platform,
            device_version: s.device_version,
            ip_address: s.ip_address,
            user_agent: s.user_agent,
            created_at: s.created_at,
            expires_at: s.expires_at
          }))
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /admin/users/:id/sessions
   * Forcefully invalidate all active tokens/sessions for a user.
   * Role: Super_Admin
   */
  async revokeUserSessions(req, res, next) {
    try {
      const userId = parseInt(req.params.id, 10);

      // Verify user exists
      const [userRows] = await db.execute('SELECT id, full_name, email FROM users WHERE id = ?', [userId]);
      if (!userRows[0]) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Target user record not found.',
            details: []
          }
        });
      }

      // Mark sessions inactive in database
      const sql = 'UPDATE user_sessions SET is_active = 0 WHERE user_id = ?';
      const [result] = await db.execute(sql, [userId]);

      // Trigger instant revocation in token blocklist service
      tokenBlocklistService.revokeAllUserTokens(userId);

      res.locals.auditAction = 'SESSION_REVOKED';
      res.locals.auditTarget = `/admin/users/${userId}/sessions`;
      res.locals.auditDelta = {
        revoked_user_id: userId,
        invalidated_sessions_count: result.affectedRows || 0
      };

      return res.status(200).json({
        data: {
          message: `All active sessions for user ID ${userId} have been forcefully revoked.`,
          user_id: userId,
          invalidated_count: result.affectedRows || 0
        }
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = adminSessionController;
