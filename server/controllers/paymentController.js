import Payment from '../models/Payment.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  createOrder,
  verifySignature,
  verifyWebhookSignature,
  finalizePayment,
  markPaymentFailed,
} from '../services/paymentService.js';
import { parsePagination, buildPaginationMeta } from '../utils/queryHelpers.js';

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Create Razorpay Order for booking
// @route   POST /api/payments/create-order
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
export const createPaymentOrder = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;
  if (!bookingId) {
    res.status(400);
    throw new Error('bookingId is required');
  }

  const orderData = await createOrder(req.user._id, bookingId);
  res.status(201).json({
    success: true,
    data: orderData,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Verify payment signature & finalize booking
// @route   POST /api/payments/verify
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400);
    throw new Error('razorpay_order_id, razorpay_payment_id, and razorpay_signature are required');
  }

  const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
  if (!payment) {
    res.status(404);
    throw new Error('Payment record not found');
  }

  if (payment.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorised to verify this payment');
  }

  const isValid = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!isValid) {
    res.status(400);
    throw new Error('Payment verification failed');
  }

  const result = await finalizePayment(razorpay_order_id, razorpay_payment_id);

  res.json({
    success: true,
    message: 'Payment verified and booking confirmed',
    data: result,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Record client-side payment failure
// @route   POST /api/payments/failed
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
export const recordPaymentFailure = asyncHandler(async (req, res) => {
  const { razorpay_order_id, reason } = req.body;
  if (!razorpay_order_id) {
    res.status(400);
    throw new Error('razorpay_order_id is required');
  }

  const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
  if (!payment) {
    res.status(404);
    throw new Error('Payment record not found');
  }

  if (payment.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorised to update this payment');
  }

  await markPaymentFailed(razorpay_order_id, reason);

  res.json({
    success: true,
    message: 'Payment failure recorded',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Handle Razorpay Webhooks (Public)
// @route   POST /api/payments/webhook
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
export const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.body; // Buffer from express.raw()

  if (!verifyWebhookSignature(rawBody, signature)) {
    return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
  }

  let eventPayload;
  try {
    eventPayload = JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
  }

  const { event, payload } = eventPayload;

  try {
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payment?.entity;
      const orderId = paymentEntity?.order_id || payload.order?.entity?.id;
      const paymentId = paymentEntity?.id;

      if (orderId && paymentId) {
        await finalizePayment(orderId, paymentId);
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = payload.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const reason = paymentEntity?.error_description || 'Payment failed';

      if (orderId) {
        await markPaymentFailed(orderId, reason);
      }
    }
  } catch (err) {
    console.error('[Webhook Processing Error]:', err.message);
  }

  // Always return 200 quickly so Razorpay doesn't retry
  return res.status(200).json({ status: 'ok' });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get user's payments
// @route   GET /api/payments/my
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
export const getMyPayments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const [total, payments] = await Promise.all([
    Payment.countDocuments({ user: req.user._id }),
    Payment.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'booking',
        populate: {
          path: 'show',
          populate: [
            { path: 'movie', select: 'title poster' },
            { path: 'theatre', select: 'name city' },
          ],
        },
      }),
  ]);

  res.json({
    success: true,
    pagination: buildPaginationMeta(total, page, limit),
    data: payments,
  });
});
