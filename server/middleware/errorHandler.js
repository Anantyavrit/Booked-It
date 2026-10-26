import logger from '../utils/logger.js';

/**
 * 404 handler for unmatched routes
 */
export const notFound = (req, res, _next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
};

/**
 * Central Error Handler Middleware
 * Maps:
 *   ValidationError  -> 400
 *   CastError        -> 400
 *   Duplicate key (11000) -> 409
 *   JsonWebTokenError / TokenExpiredError -> 401
 *   entity.too.large (payload too large) -> 413
 *   In production, unknown 500 errors return "Something went wrong" (no stack).
 *   Server-side logs error with req.id.
 */
export const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || 'Internal Server Error';

  // 1. Mongoose Validation Error -> 400
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // 2. Mongoose CastError (invalid ObjectId or type casting) -> 400
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for field "${err.path || 'id'}": ${err.value}`;
  }

  // 3. MongoDB duplicate key error (11000) -> 409
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with that ${field} already exists`;
  }

  // 4. JWT Errors -> 401
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = err.name === 'TokenExpiredError' ? 'Token expired, please log in again' : 'Invalid authorization token';
  }

  // 5. Body payload too large (Express / body-parser) -> 413
  if (err.type === 'entity.too.large' || err.status === 413) {
    statusCode = 413;
    message = 'Request payload too large';
  }

  // Server-side logging with request ID
  const reqId = req.id || 'N/A';
  if (statusCode >= 500) {
    logger.error(`[Error 500][req:${reqId}] ${req.method} ${req.originalUrl} - ${err.stack || err.message}`);
  }

  // In production, mask unhandled internal errors
  const isProd = process.env.NODE_ENV === 'production';
  const responseMessage = (isProd && statusCode === 500) ? 'Something went wrong' : message;

  res.status(statusCode).json({
    success: false,
    message: responseMessage,
  });
};

export default errorHandler;
