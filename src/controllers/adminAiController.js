const db = require('../config/db');

const adminAiController = {
  /**
   * GET /admin/ai/usage
   * Aggregated token consumption and query costs.
   * Roles: Super_Admin
   */
  async getAiUsage(req, res, next) {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_queries,
          COALESCE(SUM(tokens_consumed), 0) as total_tokens,
          COALESCE(SUM(query_cost), 0.000000) as total_cost
        FROM ai_usage_logs
      `;
      const [rows] = await db.execute(sql, []);
      const stats = rows[0] || { total_queries: 0, total_tokens: 0, total_cost: 0 };

      return res.status(200).json({
        data: {
          summary: {
            total_queries: Number(stats.total_queries),
            total_tokens: Number(stats.total_tokens),
            total_cost: parseFloat(stats.total_cost)
          }
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /admin/ai/prompts/:id
   * Dynamically update system prompts and learning guardrails.
   * Roles: Super_Admin
   */
  async updateAiPrompt(req, res, next) {
    try {
      const promptId = parseInt(req.params.id, 10);
      const { title, system_prompt, learning_guardrails } = req.body;
      const adminId = req.user.id;

      // Update prompt record
      const sql = `
        UPDATE ai_prompts 
        SET title = ?, system_prompt = ?, learning_guardrails = ?, version = version + 1, updated_by = ?, updated_at = NOW()
        WHERE id = ?
      `;
      const [result] = await db.execute(sql, [title, system_prompt, learning_guardrails || null, adminId, promptId]);

      res.locals.auditAction = 'PROMPT_UPDATED';
      res.locals.auditTarget = `/admin/ai/prompts/${promptId}`;
      res.locals.auditDelta = { prompt_id: promptId, title, system_prompt, learning_guardrails };

      return res.status(200).json({
        data: {
          message: 'System prompt and guardrails updated successfully.',
          prompt: {
            id: promptId,
            title,
            system_prompt,
            learning_guardrails,
            updated_by: adminId
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = adminAiController;
