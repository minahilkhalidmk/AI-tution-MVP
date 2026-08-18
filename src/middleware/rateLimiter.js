const rateLimit = require('express-rate-limit');

// Rate Limiting Middleware - Rejects abuse/DoS with 429 Too Many Requests
const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests targeting administrative endpoints. Please try again later.',
        details: []
      }
    });
  }
});

module.exports = adminRateLimiter;
