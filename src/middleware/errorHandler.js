/**
 * Filtered Standard Response & Global Error Handler
 * Ensures no stack trace leaks in production responses
 */
const errorHandler = (err, req, res, next) => {
  console.error('[System Error]', err);

  const statusCode = err.statusCode || err.status || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'An unexpected internal server error occurred.'
    : (err.message || 'Internal server error');

  return res.status(statusCode).json({
    error: {
      code,
      message,
      details: err.details || []
    }
  });
};

module.exports = errorHandler;
