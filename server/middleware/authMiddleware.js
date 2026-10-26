import jwt from 'jsonwebtoken';
import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/User.js';

// ─────────────────────────────────────────────────────────────────────────────
// protect — verifies the JWT from the Authorization header.
// Attaches the full user document (minus password) to req.user.
// ─────────────────────────────────────────────────────────────────────────────
export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Token must be present and follow the "Bearer <token>" scheme
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401);
    throw new Error('Not authorised — no token provided');
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    res.status(401);
    // Distinguish between expired and simply invalid
    throw new Error(err.name === 'TokenExpiredError' ? 'Token expired, please log in again' : 'Not authorised — invalid token');
  }

  // Fetch fresh user data (so role changes are respected immediately)
  const user = await User.findById(decoded.id);
  if (!user) {
    res.status(401);
    throw new Error('Not authorised — user no longer exists');
  }

  req.user = user; // attach to request for downstream handlers
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// authorizeRoles — call after protect.
// Usage: authorizeRoles('admin')  or  authorizeRoles('admin', 'moderator')
// ─────────────────────────────────────────────────────────────────────────────
export const authorizeRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    res.status(403);
    throw new Error(
      `Access denied — role "${req.user.role}" is not permitted to perform this action`
    );
  }
  next();
};
