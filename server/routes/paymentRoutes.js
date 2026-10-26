import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  createPaymentOrder,
  verifyPayment,
  recordPaymentFailure,
  getMyPayments,
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many payment requests. Please try again after 10 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/create-order', protect, orderLimiter, createPaymentOrder);
router.post('/verify', protect, verifyPayment);
router.post('/failed', protect, recordPaymentFailure);
router.get('/my', protect, getMyPayments);

export default router;
