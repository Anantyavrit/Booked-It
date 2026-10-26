import crypto from 'crypto';
import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';
import Seat from '../models/Seat.js';
import Notification from '../models/Notification.js';
import { razorpay } from '../config/razorpay.js';
import { confirmBooking } from './bookingService.js';

/**
 * createOrder(userId, bookingId)
 * Idempotent Razorpay order creation for a pending booking.
 * Extends the hold ONCE to PAYMENT_HOLD_MINUTES.
 */
export const createOrder = async (userId, bookingId) => {
  const PAYMENT_HOLD_MINUTES = parseInt(process.env.PAYMENT_HOLD_MINUTES || '10', 10);

  const booking = await Booking.findById(bookingId).populate('show');
  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  if (booking.user.toString() !== userId.toString()) {
    const err = new Error('Not authorised to create payment for this booking');
    err.statusCode = 403;
    throw err;
  }

  if (booking.status !== 'pending') {
    const err = new Error(`Cannot pay for a booking with status "${booking.status}"`);
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();
  if (now > new Date(booking.holdExpiresAt)) {
    booking.status = 'expired';
    await booking.save();
    const err = new Error('Seat hold has expired. Please reselect your seats.');
    err.statusCode = 410;
    throw err;
  }

  // Idempotency check: if Payment already created for this booking, return existing details
  const existingPayment = await Payment.findOne({
    booking: booking._id,
    status: 'created',
  });

  if (existingPayment) {
    return {
      orderId: existingPayment.razorpayOrderId,
      amount: existingPayment.amount,
      currency: existingPayment.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      bookingId: booking._id,
    };
  }

  // Extend the hold ONCE: booking.holdExpiresAt and seats where booking = this booking & status = 'held'
  const newHoldExpiresAt = new Date(now.getTime() + PAYMENT_HOLD_MINUTES * 60 * 1000);
  booking.holdExpiresAt = newHoldExpiresAt;

  await Seat.updateMany(
    {
      booking: booking._id,
      status: 'held',
    },
    {
      $set: { holdExpiresAt: newHoldExpiresAt },
    }
  );

  // Amount in paise from database (never from frontend)
  const amountPaise = Math.round(booking.amount * 100);

  // Create Razorpay order via official SDK
  const receiptId = String(booking._id).slice(0, 40);
  let order;
  try {
    order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: receiptId,
      notes: {
        bookingId: booking._id.toString(),
        userId: userId.toString(),
      },
    });
  } catch (err) {
    console.error('[Razorpay Order Creation Error]:', err);
    const error = new Error(`Razorpay order creation failed: ${err.error?.description || err.message}`);
    error.statusCode = 500;
    throw error;
  }

  booking.razorpayOrderId = order.id;
  await booking.save();

  await Payment.create({
    booking: booking._id,
    user: userId,
    razorpayOrderId: order.id,
    amount: amountPaise,
    currency: 'INR',
    status: 'created',
  });

  return {
    orderId: order.id,
    amount: amountPaise,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
    bookingId: booking._id,
  };
};

/**
 * verifySignature(orderId, paymentId, signature)
 * Timing-safe HMAC-SHA256 signature verification.
 */
export const verifySignature = (orderId, paymentId, signature) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  if (typeof orderId !== 'string' || typeof paymentId !== 'string' || typeof signature !== 'string') {
    return false;
  }

  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const providedBuffer = Buffer.from(signature, 'hex');

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
};

/**
 * verifyWebhookSignature(rawBody, signatureHeader)
 * Validates Razorpay Webhook X-Razorpay-Signature with timingSafeEqual.
 */
export const verifyWebhookSignature = (rawBody, signatureHeader) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || typeof signatureHeader !== 'string') return false;
  if (!Buffer.isBuffer(rawBody)) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const providedBuffer = Buffer.from(signatureHeader, 'hex');

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
};

/**
 * finalizePayment(orderId, paymentId)
 * Core atomic execution invoked by both /verify and /webhook.
 * Idempotent lock: atomically changes status from 'created' to 'paid'.
 */
export const finalizePayment = async (orderId, paymentId) => {
  // Step 1: Atomic lock
  const payment = await Payment.findOneAndUpdate(
    {
      razorpayOrderId: orderId,
      // 'failed' is included: Razorpay Checkout lets the user retry on the same
      // order, so a later success must still confirm (never strand captured money).
      status: { $in: ['created', 'failed'] },
    },
    {
      $set: {
        status: 'paid',
        razorpayPaymentId: paymentId,
      },
    },
    { new: true }
  );

  // If nothing was modified, payment was already finalized or does not exist
  if (!payment) {
    const existing = await Payment.findOne({ razorpayOrderId: orderId });
    if (existing) {
      const currentBooking = await Booking.findById(existing.booking);
      return currentBooking;
    }
    const err = new Error('Payment record not found');
    err.statusCode = 404;
    throw err;
  }

  const booking = await Booking.findById(payment.booking);
  if (!booking) {
    const err = new Error('Associated booking not found');
    err.statusCode = 404;
    throw err;
  }

  // Step 2 & 3: Attempt booking confirmation
  try {
    const confirmedBooking = await confirmBooking(booking._id);
    confirmedBooking.razorpayPaymentId = paymentId;
    await confirmedBooking.save();

    // Create booking_confirmed notification
    await Notification.create({
      user: booking.user,
      type: 'booking_confirmed',
      message: `Your booking (Code: ${confirmedBooking.bookingCode}) for ${confirmedBooking.seats.join(', ')} has been confirmed!`,
      booking: booking._id,
    });

    return confirmedBooking;
  } catch (confirmError) {
    console.error('[Payment Finalization Conflict - Initiating Refund]:', confirmError.message);

    // Issue full refund via Razorpay so user's money is never stranded
    try {
      const refund = await razorpay.payments.refund(paymentId, {
        notes: { reason: 'Booking confirmation failed (expired or seats lost)' },
      });
      payment.status = 'refunded';
      payment.refundId = refund.id;
    } catch (refundErr) {
      console.error('[Razorpay Refund API Error]:', refundErr.message);
      payment.status = 'refund_pending';
    }

    payment.failureReason = confirmError.message;
    await payment.save();

    booking.status = 'expired';
    await booking.save();

    // Notify user of payment failure / refund
    await Notification.create({
      user: booking.user,
      type: 'payment_failed',
      message: `Booking could not be confirmed: ${confirmError.message}. A full refund has been initiated.`,
      booking: booking._id,
    });

    return {
      success: false,
      status: 'failed',
      message: 'Booking could not be confirmed. A full refund has been initiated.',
      booking,
    };
  }
};

/**
 * refundBooking(booking)
 * Cancels payment and triggers Razorpay refund for a cancelled booking.
 */
export const refundBooking = async (booking) => {
  const payment = await Payment.findOne({
    booking: booking._id,
    status: 'paid',
  });

  if (!payment || !payment.razorpayPaymentId) {
    return { refunded: false, message: 'No paid Razorpay transaction to refund' };
  }

  try {
    const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
      notes: { reason: 'User cancellation' },
    });

    payment.status = 'refunded';
    payment.refundId = refund.id;
    await payment.save();

    await Notification.create({
      user: booking.user,
      type: 'refund_issued',
      message: `Refund of ₹${(payment.amount / 100).toFixed(2)} has been successfully issued for booking ${booking.bookingCode || booking._id}.`,
      booking: booking._id,
    });

    return { refunded: true, refundId: refund.id };
  } catch (err) {
    console.error('[Razorpay Cancellation Refund Error]:', err.message);
    payment.status = 'refund_pending';
    payment.failureReason = err.message;
    await payment.save();

    return {
      refunded: false,
      status: 'refund_pending',
      error: 'Refund pending admin/gateway resolution',
    };
  }
};

/**
 * markPaymentFailed(orderId, reason)
 * Marks a payment as failed; leaves booking pending so user can retry.
 */
export const markPaymentFailed = async (orderId, reason) => {
  const payment = await Payment.findOne({ razorpayOrderId: orderId });
  if (!payment) return;

  if (payment.status === 'created') {
    payment.status = 'failed';
    payment.failureReason = reason || 'Payment cancelled or failed';
    await payment.save();

    await Notification.create({
      user: payment.user,
      type: 'payment_failed',
      message: `Payment attempt failed: ${payment.failureReason}. You may retry before your seat hold expires.`,
      booking: payment.booking,
    });
  }
};
