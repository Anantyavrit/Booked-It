import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking is required'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    razorpayOrderId: {
      type: String,
      required: [true, 'razorpayOrderId is required'],
      unique: true,
    },
    razorpayPaymentId: {
      type: String,
      unique: true,
      sparse: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount in paise is required'],
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['created', 'paid', 'failed', 'refund_pending', 'refunded'],
      default: 'created',
    },
    refundId: {
      type: String,
    },
    failureReason: {
      type: String,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ booking: 1 });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
