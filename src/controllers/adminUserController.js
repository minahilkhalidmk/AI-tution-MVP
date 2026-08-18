const db = require('../config/db');
const bcrypt = require('bcryptjs');

const adminUserController = {
  /**
   * GET /admin/users
   * Retrieve paginated, searchable list of users (students, tutors, parents).
   * Roles: Super_Admin
   */
  async getUsers(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const offset = (page - 1) * limit;
      const role = req.query.role || null;
      const search = req.query.search ? `%${req.query.search.trim()}%` : null;

      let countSql = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
      let sql = 'SELECT id, full_name, email, role, status, created_at, updated_at FROM users WHERE 1=1';
      const params = [];

      if (role) {
        countSql += ' AND role = ?';
        sql += ' AND role = ?';
        params.push(role);
      }

      if (search) {
        countSql += ' AND (full_name LIKE ? OR email LIKE ?)';
        sql += ' AND (full_name LIKE ? OR email LIKE ?)';
        params.push(search, search);
      }

      sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
      const queryParams = [...params, limit, offset];

      const [countRows] = await db.execute(countSql, params);
      const totalUsers = countRows[0] ? countRows[0].total : 0;

      const [users] = await db.execute(sql, queryParams);

      return res.status(200).json({
        data: {
          users,
          pagination: {
            total: totalUsers,
            page,
            limit,
            totalPages: Math.ceil(totalUsers / limit) || 1
          }
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /admin/users
   * Provision new user accounts with enforced password hashing.
   * Role: Super_Admin
   */
  async createUser(req, res, next) {
    try {
      const { full_name, email, password, role } = req.body;

      // Check if email already exists
      const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
      if (existing && existing.length > 0) {
        return res.status(409).json({
          error: {
            code: 'EMAIL_EXISTS',
            message: 'A user with this email address already exists.',
            details: [{ field: 'email', message: 'Email address is already in use' }]
          }
        });
      }

      // Hash password using bcrypt
      const password_hash = await bcrypt.hash(password, 10);

      // Insert parameterized query
      const sql = 'INSERT INTO users (full_name, email, password_hash, role, status, created_at) VALUES (?, ?, ?, ?, "active", NOW())';
      const [result] = await db.execute(sql, [full_name, email, password_hash, role]);

      const newUserId = result.insertId;

      res.locals.auditAction = 'USER_PROVISIONED';
      res.locals.auditTarget = `/admin/users/${newUserId}`;
      res.locals.auditDelta = { created_user_id: newUserId, full_name, email, role, status: 'active' };

      return res.status(201).json({
        data: {
          message: 'User provisioned successfully.',
          user: {
            id: newUserId,
            full_name,
            email,
            role,
            status: 'active'
          }
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /admin/users/:id
   * Update profile information, email records, or assigned system roles.
   * Role: Super_Admin
   */
  async updateUser(req, res, next) {
    try {
      const userId = parseInt(req.params.id, 10);
      const { full_name, email, role } = req.body;

      const [userRows] = await db.execute('SELECT id, full_name, email, role, status FROM users WHERE id = ?', [userId]);
      const existingUser = userRows[0];

      if (!existingUser) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Target user record not found.',
            details: []
          }
        });
      }

      const sql = 'UPDATE users SET full_name = ?, email = ?, role = ?, updated_at = NOW() WHERE id = ?';
      await db.execute(sql, [full_name, email, role, userId]);

      res.locals.auditAction = 'USER_UPDATED';
      res.locals.auditTarget = `/admin/users/${userId}`;
      res.locals.auditDelta = {
        previous: { full_name: existingUser.full_name, email: existingUser.email, role: existingUser.role },
        updated: { full_name, email, role }
      };

      return res.status(200).json({
        data: {
          message: 'User profile updated successfully.',
          user: {
            id: userId,
            full_name,
            email,
            role,
            status: existingUser.status
          }
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /admin/users/:id/status
   * Modify account status (active, suspended, banned). Never hard-delete.
   * Role: Super_Admin
   */
  async updateUserStatus(req, res, next) {
    try {
      const userId = parseInt(req.params.id, 10);
      const { status } = req.body;

      const [userRows] = await db.execute('SELECT id, full_name, email, role, status FROM users WHERE id = ?', [userId]);
      const existingUser = userRows[0];

      if (!existingUser) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Target user record not found.',
            details: []
          }
        });
      }

      const sql = 'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?';
      await db.execute(sql, [status, userId]);

      res.locals.auditAction = 'USER_STATUS_MUTATED';
      res.locals.auditTarget = `/admin/users/${userId}/status`;
      res.locals.auditDelta = {
        previous_status: existingUser.status,
        new_status: status
      };

      return res.status(200).json({
        data: {
          message: `User account status modified to '${status}'.`,
          user: {
            id: userId,
            full_name: existingUser.full_name,
            email: existingUser.email,
            status
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = adminUserController;
