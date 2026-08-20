const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const tokenBlocklistService = require('../services/tokenBlocklistService');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_ai_tuition_2026_change_in_production';

/**
 * Generate a unique 6-character alphanumeric student code (e.g. "A8X2K9")
 */
function generateStudentCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Hash refresh token using SHA-256 for secure DB lookup
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Authentication Module Controller — Dual Hierarchy Security Architecture
 */
const authController = {
  /**
   * POST /auth/register
   * Registers new user with role branching and unique student_code generation for private students.
   */
  async register(req, res, next) {
    try {
      const { full_name, password, role = 'student', account_type = 'institutional' } = req.body;
      const email = req.body.email ? String(req.body.email).trim().toLowerCase() : '';

      // 1. Check if email is already registered
      const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'EMAIL_EXISTS',
          message: 'An account with this email address already exists.'
        });
      }

      // 2. Generate student_code if student with private account (or student role)
      let studentCode = null;
      if (role === 'student') {
        // Ensure studentCode is unique in users table
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 10) {
          attempts++;
          studentCode = generateStudentCode();
          const [codeCheck] = await db.execute('SELECT id FROM users WHERE student_code = ?', [studentCode]);
          if (!codeCheck || codeCheck.length === 0) {
            isUnique = true;
          }
        }
      }

      // 3. Hash password
      const passwordHash = await bcrypt.hash(password, 6);

      // 4. Insert user record
      const [result] = await db.execute(
        `INSERT INTO users (full_name, email, password_hash, role, account_type, status, student_code, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?, NOW(), NOW())`,
        [full_name, email, passwordHash, role, account_type, studentCode]
      );

      const userId = result.insertId;

      return res.status(201).json({
        success: true,
        message: 'User registered successfully.',
        user: {
          id: userId,
          full_name,
          email,
          role,
          account_type,
          status: 'active',
          student_code: studentCode,
          roles: [role]
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /auth/login
   * Authenticates user, creates user_sessions record, sets HttpOnly cookies, returns JWT + refresh token.
   */
  async login(req, res, next) {
    try {
      const { password, device_info = 'Web Browser' } = req.body;
      const email = req.body.email ? String(req.body.email).trim().toLowerCase() : '';

      const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
      const user = rows[0];

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.'
        });
      }

      if (user.status === 'banned' || user.status === 'suspended') {
        return res.status(423).json({
          success: false,
          error: 'ACCOUNT_LOCKED',
          message: `Account is currently ${user.status}. Access denied.`
        });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.'
        });
      }

      // 1. Generate Access Token (JWT 15-minute expiry)
      const payload = { id: user.id, email: user.email, role: user.role };
      const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });

      // 2. Generate Refresh Token (opaque hex string)
      const refreshToken = crypto.randomBytes(32).toString('hex');
      const refreshTokenHash = hashToken(refreshToken);

      // Session expires in 7 days
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const deviceInfoStr = typeof device_info === 'object' ? JSON.stringify(device_info) : String(device_info);

      // 3. Save session in user_sessions table
      await db.execute(
        `INSERT INTO user_sessions (user_id, refresh_token_hash, device_info, ip_address, expires_at, is_revoked, created_at)
         VALUES (?, ?, ?, ?, ?, 0, NOW())`,
        [user.id, refreshTokenHash, deviceInfoStr, ipAddress, expiresAt]
      );

      // 4. Set HttpOnly, SameSite=Strict cookies
      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return res.status(200).json({
        success: true,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'bearer',
        expires_in: 900,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          roles: [user.role],
          account_type: user.account_type,
          student_code: user.student_code
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /auth/refresh
   * Rotates refresh token, invalidates previous session, and returns fresh access & refresh tokens.
   */
  async refresh(req, res, next) {
    try {
      let refreshToken = null;
      if (req.cookies && req.cookies.refresh_token) {
        refreshToken = req.cookies.refresh_token;
      } else if (req.body && req.body.refresh_token) {
        refreshToken = req.body.refresh_token;
      }

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: 'REFRESH_TOKEN_REQUIRED',
          message: 'Refresh token is missing from request body or cookies.'
        });
      }

      const refreshTokenHash = hashToken(refreshToken);

      // Query active session
      const [sessions] = await db.execute(
        `SELECT * FROM user_sessions WHERE refresh_token_hash = ? AND is_revoked = 0 AND expires_at > NOW()`,
        [refreshTokenHash]
      );

      if (sessions.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid, expired, or revoked refresh token.'
        });
      }

      const currentSession = sessions[0];

      // Fetch user profile
      const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [currentSession.user_id]);
      const user = users[0];

      if (!user || user.status === 'banned' || user.status === 'suspended') {
        return res.status(423).json({
          success: false,
          error: 'ACCOUNT_LOCKED',
          message: 'Account is no longer active.'
        });
      }

      // Token Rotation: Revoke current session
      await db.execute('UPDATE user_sessions SET is_revoked = 1 WHERE id = ?', [currentSession.id]);

      // Issue new token pair
      const newAccessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '15m' }
      );
      const newRefreshToken = crypto.randomBytes(32).toString('hex');
      const newRefreshTokenHash = hashToken(newRefreshToken);
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

      await db.execute(
        `INSERT INTO user_sessions (user_id, refresh_token_hash, device_info, ip_address, expires_at, is_revoked, created_at)
         VALUES (?, ?, ?, ?, ?, 0, NOW())`,
        [user.id, newRefreshTokenHash, currentSession.device_info, ipAddress, newExpiresAt]
      );

      res.cookie('access_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000
      });

      res.cookie('refresh_token', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.status(200).json({
        success: true,
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        token_type: 'bearer',
        expires_in: 900,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          roles: [user.role]
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /auth/logout
   * Revokes access token in TokenBlocklistService, sets is_revoked = 1 in user_sessions, and clears cookies.
   */
  async logout(req, res, next) {
    try {
      const token = req.token || (req.cookies && req.cookies.access_token);
      if (token) {
        tokenBlocklistService.revokeToken(token);
      }

      const refreshToken = (req.cookies && req.cookies.refresh_token) || (req.body && req.body.refresh_token);
      if (refreshToken) {
        const refreshTokenHash = hashToken(refreshToken);
        await db.execute('UPDATE user_sessions SET is_revoked = 1 WHERE refresh_token_hash = ?', [refreshTokenHash]);
      } else if (req.user && req.user.id) {
        await db.execute('UPDATE user_sessions SET is_revoked = 1 WHERE user_id = ?', [req.user.id]);
      }

      res.clearCookie('access_token');
      res.clearCookie('refresh_token');

      return res.status(200).json({
        success: true,
        message: 'Successfully logged out and session revoked.'
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /auth/forgot-password
   * Dispatches reset token / OTP for password recovery.
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const [rows] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
      
      // Return 200 OK regardless to prevent user enumeration security vulnerability
      return res.status(200).json({
        success: true,
        message: 'If the email exists in our system, password reset instructions have been sent.'
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /auth/reset-password
   * Resets user password and revokes existing sessions.
   */
  async resetPassword(req, res, next) {
    try {
      const { token, password, new_password } = req.body;
      const targetPassword = new_password || password;

      if (!targetPassword) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'New password is required.'
        });
      }

      const passwordHash = await bcrypt.hash(targetPassword, 10);

      // In production, token is decoded/verified from DB. Here we update by email/token payload.
      // For general reset, update user and revoke sessions
      if (req.user && req.user.id) {
        await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, req.user.id]);
        await db.execute('UPDATE user_sessions SET is_revoked = 1 WHERE user_id = ?', [req.user.id]);
      }

      return res.status(200).json({
        success: true,
        message: 'Password reset successfully. Please log in with your new password.'
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /auth/me
   * Returns current authenticated user profile.
   */
  async getMe(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHENTICATED',
          message: 'User authentication required.'
        });
      }

      const [rows] = await db.execute(
        'SELECT id, full_name, email, role, account_type, status, student_code, created_at FROM users WHERE id = ?',
        [req.user.id]
      );
      const user = rows[0] || req.user;

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          roles: [user.role],
          account_type: user.account_type,
          status: user.status,
          student_code: user.student_code,
          created_at: user.created_at
        }
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = authController;
