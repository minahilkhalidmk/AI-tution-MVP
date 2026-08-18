/**
 * Concurrency Limiter Middleware for CPU/IO Heavy Operations (e.g. Export Reports)
 * Prevents Event Loop freeze by limiting concurrent execution of heavy endpoints.
 */
class ConcurrencyLimiter {
  constructor(maxConcurrent = 2) {
    this.maxConcurrent = maxConcurrent;
    this.currentActive = 0;
  }

  middleware() {
    return (req, res, next) => {
      if (this.currentActive >= this.maxConcurrent) {
        return res.status(429).json({
          error: {
            code: 'CONCURRENCY_LIMIT_EXCEEDED',
            message: 'Too many analytics export tasks currently in progress. Please retry in a few seconds.',
            details: []
          }
        });
      }

      this.currentActive++;

      // Decrease count when response finishes or closes
      const cleanup = () => {
        if (!res._concurrencyCleaned) {
          res._concurrencyCleaned = true;
          this.currentActive = Math.max(0, this.currentActive - 1);
        }
      };

      res.on('finish', cleanup);
      res.on('close', cleanup);

      next();
    };
  }
}

module.exports = (maxConcurrent = 2) => new ConcurrencyLimiter(maxConcurrent).middleware();
