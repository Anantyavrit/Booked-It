import crypto from 'crypto';

/**
 * Small Logger Utility & HTTP Request Logging Middleware
 * Never logs request bodies, tokens, passwords, payment signatures, or Authorization headers.
 */

const isProd = process.env.NODE_ENV === 'production';

export const logger = {
  info: (...args) => {
    if (!isProd) console.log('[INFO]', ...args);
  },
  warn: (...args) => {
    console.warn('[WARN]', ...args);
  },
  error: (...args) => {
    console.error('[ERROR]', ...args);
  },
};

/**
 * HTTP Request Logger Middleware
 * - Attaches a unique req.id (UUID)
 * - In dev: logs method, path, status, duration
 * - In prod: logs only 4xx (warnings) and 5xx (errors) with req.id
 */
export const requestLogger = (req, res, next) => {
  req.id = crypto.randomUUID();
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    if (!isProd) {
      console.log(`[HTTP] ${method} ${originalUrl} -> ${statusCode} (${duration}ms) [id: ${req.id}]`);
    } else if (statusCode >= 500) {
      console.error(`[HTTP Error] ${method} ${originalUrl} -> ${statusCode} (${duration}ms) [id: ${req.id}]`);
    }
  });

  next();
};

export default logger;
