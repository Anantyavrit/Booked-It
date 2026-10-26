import express from 'express';
import rateLimit from 'express-rate-limit';
import { getDashboardStats } from '../controllers/adminController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// 60 requests per 10 minutes per user
const statsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// All admin routes: must be authenticated and have role=admin
router.use(protect, authorizeRoles('admin'));

router.get('/stats', statsLimiter, getDashboardStats);

export default router;
