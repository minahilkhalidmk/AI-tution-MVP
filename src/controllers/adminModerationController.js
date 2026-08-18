const db = require('../config/db');

const adminModerationController = {
  /**
   * GET /admin/moderation/flagged
   * Review AI inputs/outputs flagged by safety filters.
   * Roles: Super_Admin
   */
  async getFlaggedModeration(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const offset = (page - 1) * limit;
      const status = req.query.status || 'pending';

      const sql = `
        SELECT f.id, f.user_id, u.full_name as user_name, u.email as user_email,
               f.input_content, f.output_content, f.violation_category, f.review_status, f.flagged_at
        FROM flagged_moderations f
        LEFT JOIN users u ON f.user_id = u.id
        WHERE f.review_status = ?
        ORDER BY f.flagged_at DESC
        LIMIT ? OFFSET ?
      `;

      const [flaggedItems] = await db.execute(sql, [status, limit, offset]);

      return res.status(200).json({
        data: {
          flagged_items: flaggedItems,
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

module.exports = adminModerationController;
