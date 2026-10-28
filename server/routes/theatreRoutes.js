import express from 'express';
import {
  getTheatres,
  getCities,
  getNearbyTheatres,
  getTheatre,
  createTheatre,
  updateTheatre,
  deleteTheatre,
} from '../controllers/theatreController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import validateObjectId from '../middleware/validateObjectId.js';

const router = express.Router();

// Public routes
router.get('/', optionalAuth, getTheatres);
router.get('/cities', getCities); // must be before /:id
router.get('/nearby', getNearbyTheatres); // must be before /:id
router.get('/:id', validateObjectId(), getTheatre);

// Admin only routes
router.post('/', protect, authorizeRoles('admin'), createTheatre);
router.put('/:id', protect, authorizeRoles('admin'), validateObjectId(), updateTheatre);
router.delete('/:id', protect, authorizeRoles('admin'), validateObjectId(), deleteTheatre);

export default router;
