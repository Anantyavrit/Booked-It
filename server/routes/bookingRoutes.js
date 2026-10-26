import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  createHold,
  releaseBookingHold,
  cancelUserBooking,
  getMyBookings,
  getBooking,
  getAllBookings,
} from '../controllers/bookingController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import validateObjectId from '../middleware/validateObjectId.js';

const router = express.Router();

const holdLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many seat hold attempts. Please try again after 10 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Protected user routes
router.post('/hold', protect, holdLimiter, createHold);
router.delete('/:id/hold', protect, validateObjectId(), releaseBookingHold);
router.post('/:id/cancel', protect, validateObjectId(), cancelUserBooking);

// User's own bookings: /my declared before /:id
router.get('/my', protect, getMyBookings);

// Admin listing
router.get('/', protect, authorizeRoles('admin'), getAllBookings);

// Single booking (owner or admin)
router.get('/:id', protect, validateObjectId(), getBooking);

export default router;
