const jwt = require('jsonwebtoken');
const tokenBlocklistService = require('../services/tokenBlocklistService');
const db = require('../config/db');

/**
 * Authentication Middleware
 * Verifies JWT signature from HttpOnly cookie or Bearer token header.
 * Checks token against blocklist and populates req.user.
 */
const authenticateToken = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check HttpOnly cookie first
    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    } 
    // 2. Fallback to Authorization: Bearer token header
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication token missing or invalid.',
          details: []
        }
      });
    }

    // Verify JWT
    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_ai_tuition_2026_change_in_production';
    const decoded = jwt.verify(token, secret);

    // Check if token is blocked
    if (tokenBlocklistService.isTokenBlocked(token, decoded.id, decoded.iat)) {
      return res.status(401).json({
        error: {
          code: 'TOKEN_REVOKED',
          message: 'Session has been invalidated. Please log in again.',
          details: []
        }
      });
    }

    // Verify user exists and status is active
    const [rows] = await db.execute('SELECT id, full_name, email, role, status FROM users WHERE id = ?', [decoded.id]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account associated with this session no longer exists.',
          details: []
        }
      });
    }

    if (user.status === 'banned' || user.status === 'suspended') {
      return res.status(423).json({
        error: {
          code: 'ACCOUNT_LOCKED',
          message: `Account is currently ${user.status}. Access denied.`,
          details: []
        }
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired. Please refresh your session.',
          details: []
        }
      });
    }

    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authorization token signature.',
        details: []
      }
    });
  }
};

module.exports = authenticateToken;
