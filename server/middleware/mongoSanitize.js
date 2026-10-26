/**
 * NoSQL Injection Sanitizer Middleware
 * Recursively removes keys beginning with '$' or containing '.' from
 * req.body, req.query, and req.params to prevent MongoDB operator injection.
 */

function sanitize(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = sanitize(obj[i]);
    }
    return obj;
  }

  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else {
      obj[key] = sanitize(obj[key]);
    }
  }

  return obj;
}

export const mongoSanitize = (req, _res, next) => {
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  next();
};

export default mongoSanitize;
