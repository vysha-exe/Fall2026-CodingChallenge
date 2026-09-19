/**
 * Central error handler — keeps route handlers thin and responses consistent.
 */
function errorHandler(err, _req, res, _next) {
  console.error('[API Error]', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
  });
}

/** Wrap async route handlers so rejected promises hit errorHandler. */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function createError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = { errorHandler, asyncHandler, createError };
