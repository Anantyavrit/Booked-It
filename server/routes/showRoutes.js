import express from 'express';
import {
  getShows,
  getShow,
  getShowSeats,
  createShow,
  updateShow,
  deleteShow,
} from '../controllers/showController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import validateObjectId from '../middleware/validateObjectId.js';

const router = express.Router();

// Public routes (with optional auth to detect admin for ?includePast=true)
router.get('/', optionalAuth, getShows);
router.get('/:id/seats', validateObjectId(), optionalAuth, getShowSeats);
router.get('/:id', validateObjectId(), getShow);

// Admin only routes
router.post('/', protect, authorizeRoles('admin'), createShow);
router.put('/:id', protect, authorizeRoles('admin'), validateObjectId(), updateShow);
router.delete('/:id', protect, authorizeRoles('admin'), validateObjectId(), deleteShow);

export default router;
