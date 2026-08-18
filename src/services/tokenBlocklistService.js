// Centralized token blocklist for instant session revocation
class TokenBlocklistService {
  constructor() {
    this.blocklist = new Set();
    this.userRevokedTimestamps = new Map(); // userId -> timestamp of forced revocation
  }

  /**
   * Revoke a specific token
   */
  revokeToken(token) {
    if (token) {
      this.blocklist.add(token);
    }
  }

  /**
   * Revoke all tokens issued for a specific user before current time
   */
  revokeAllUserTokens(userId) {
    this.userRevokedTimestamps.set(Number(userId), Date.now());
  }

  /**
   * Check if token is blocklisted
   */
  isTokenBlocked(token, userId, tokenIssuedAt) {
    if (this.blocklist.has(token)) {
      return true;
    }
    if (userId && this.userRevokedTimestamps.has(Number(userId))) {
      const revokedAt = this.userRevokedTimestamps.get(Number(userId));
      const iatMs = tokenIssuedAt ? tokenIssuedAt * 1000 : 0;
      if (iatMs <= revokedAt) {
        return true;
      }
    }
    return false;
  }
}

module.exports = new TokenBlocklistService();
