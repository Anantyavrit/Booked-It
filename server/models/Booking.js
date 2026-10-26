import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    show: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Show',
      required: [true, 'Show is required'],
    },
    seats: {
      type: [String],
      required: [true, 'Seats are required'],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Booking must have at least one seat',
      },
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'expired'],
      default: 'pending',
    },
    holdExpiresAt: {
      type: Date,
      required: true,
    },
    bookingCode: {
      type: String,
      unique: true,
      sparse: true, // only indexed/enforced when non-null
    },
    confirmedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    // Placeholder fields for Phase 7:
    razorpayOrderId: {
      type: String,
    },
    razorpayPaymentId: {
      type: String,
    },
  },
  { timestamps: true }
);

// Indexes
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ show: 1, status: 1 });

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
