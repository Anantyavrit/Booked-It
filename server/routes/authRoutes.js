import express from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, getMe, adminCheck } from '../controllers/authController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── Rate limiter: max 10 requests per 15 minutes per IP ─────────────────────
const createAuthLimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many attempts from this IP, please try again after 15 minutes',
  },
  standardHeaders: true, // return RateLimit-* headers
  legacyHeaders: false,
});

// ── Public routes ─────────────────────────────────────────────────────────────
router.post('/register', createAuthLimiter(), register);
router.post('/login',    createAuthLimiter(), login);

// ── Protected routes ──────────────────────────────────────────────────────────
router.get('/me',          protect, getMe);
router.get('/admin-check', protect, authorizeRoles('admin'), adminCheck);

export default router;
