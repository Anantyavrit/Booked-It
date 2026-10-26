import mongoose from 'mongoose';

const seatSchema = new mongoose.Schema(
  {
    show: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Show',
      required: [true, 'Show is required'],
    },
    label: {
      type: String,
      required: [true, 'Seat label is required'],
      trim: true,
    },
    row: {
      type: String,
      required: [true, 'Row is required'],
      trim: true,
    },
    number: {
      type: Number,
      required: [true, 'Seat number is required'],
    },
    status: {
      type: String,
      enum: ['available', 'held', 'booked'],
      default: 'available',
    },
    holdExpiresAt: {
      type: Date,
      default: null,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
  },
  { timestamps: true }
);

// Unique index: one seat label per show
seatSchema.index({ show: 1, label: 1 }, { unique: true });

// Status queries for seat maps
seatSchema.index({ show: 1, status: 1 });

// Fast lookup for hold expiry sweeps
seatSchema.index({ status: 1, holdExpiresAt: 1 });

const Seat = mongoose.model('Seat', seatSchema);
export default Seat;
