import crypto from 'crypto';
import Seat from '../models/Seat.js';
import Booking from '../models/Booking.js';
import Show from '../models/Show.js';
import Theatre from '../models/Theatre.js';
import Notification from '../models/Notification.js';
import { emitSeatUpdate } from '../utils/socket.js';
import { refundBooking } from './paymentService.js';

/**
 * generateSeatsForShow(show)
 * Generates seats for a given show based on the theatre screen's rows & seatsPerRow.
 */
export const generateSeatsForShow = async (show) => {
  if (!show) return;

  let theatre = show.theatre;
  if (!theatre || !theatre.screens) {
    theatre = await Theatre.findById(show.theatre);
  }
  if (!theatre) return;

  const screen = theatre.screens.find((s) => s.name === show.screenName);
  if (!screen) return;

  const { rows, seatsPerRow } = screen;
  const seatDocs = [];

  for (let r = 0; r < rows; r++) {
    const rowLetter = String.fromCharCode(65 + r);
    for (let n = 1; n <= seatsPerRow; n++) {
      seatDocs.push({
        show: show._id,
        label: `${rowLetter}${n}`,
        row: rowLetter,
        number: n,
        status: 'available',
        holdExpiresAt: null,
        booking: null,
      });
    }
  }

  try {
    await Seat.insertMany(seatDocs, { ordered: false });
  } catch (err) {
    if (err.code !== 11000 && !err.writeErrors) {
      console.error('Error generating seats:', err);
    }
  }
};

/**
 * holdSeats(userId, showId, labels)
 */
export const holdSeats = async (userId, showId, labels) => {
  const HOLD_MINUTES = parseInt(process.env.HOLD_MINUTES || '5', 10);
  const MAX_SEATS = parseInt(process.env.MAX_SEATS_PER_BOOKING || '6', 10);

  if (!Array.isArray(labels) || labels.length === 0) {
    const err = new Error('Please select at least one seat');
    err.statusCode = 400;
    throw err;
  }

  const normalizedLabels = [...new Set(labels.map((l) => String(l).trim().toUpperCase()))];
  if (normalizedLabels.length !== labels.length) {
    const err = new Error('Duplicate seats in request');
    err.statusCode = 400;
    throw err;
  }

  if (normalizedLabels.length > MAX_SEATS) {
    const err = new Error(`Cannot hold more than ${MAX_SEATS} seats per booking`);
    err.statusCode = 400;
    throw err;
  }

  const show = await Show.findById(showId).populate('theatre');
  if (!show) {
    const err = new Error('Show not found');
    err.statusCode = 404;
    throw err;
  }

  if (new Date(show.startTime) <= new Date()) {
    const err = new Error('Cannot book seats for a show in the past');
    err.statusCode = 400;
    throw err;
  }

  await generateSeatsForShow(show);

  const screen = show.theatre.screens.find((s) => s.name === show.screenName);
  if (!screen) {
    const err = new Error('Screen not found for this show');
    err.statusCode = 400;
    throw err;
  }

  for (const label of normalizedLabels) {
    const rowChar = label.charAt(0);
    const num = parseInt(label.slice(1), 10);
    const rowIndex = rowChar.charCodeAt(0) - 65;
    if (
      rowIndex < 0 ||
      rowIndex >= screen.rows ||
      isNaN(num) ||
      num < 1 ||
      num > screen.seatsPerRow
    ) {
      const err = new Error(`Seat "${label}" does not exist in screen layout`);
      err.statusCode = 400;
      throw err;
    }
  }

  // 1. Release existing pending holds of this user
  const existingPending = await Booking.find({ user: userId, status: 'pending' });
  for (const pending of existingPending) {
    const stillHeld = await Seat.find({ booking: pending._id, status: 'held' }, 'label');
    await Seat.updateMany(
      { booking: pending._id, status: 'held' },
      { $set: { status: 'available', booking: null, holdExpiresAt: null } }
    );
    pending.status = 'expired';
    await pending.save();

    // Only announce seats we actually released (an expired hold may already
    // have been taken over by someone else).
    emitSeatUpdate(
      pending.show,
      stillHeld.map((seat) => ({ label: seat.label, status: 'available' }))
    );
  }

  // 2. Create the new pending Booking
  const now = new Date();
  const holdExpiresAt = new Date(now.getTime() + HOLD_MINUTES * 60 * 1000);
  const amount = normalizedLabels.length * show.price;

  const booking = await Booking.create({
    user: userId,
    show: show._id,
    seats: normalizedLabels,
    amount,
    status: 'pending',
    holdExpiresAt,
  });

  // 3. Conditional atomic updateMany
  const holdResult = await Seat.updateMany(
    {
      show: show._id,
      label: { $in: normalizedLabels },
      $or: [
        { status: 'available' },
        { status: 'held', holdExpiresAt: { $lt: now } },
      ],
    },
    {
      $set: {
        status: 'held',
        booking: booking._id,
        holdExpiresAt: booking.holdExpiresAt,
      },
    }
  );

  // 4. Rollback if any seat could not be held
  if (holdResult.modifiedCount !== normalizedLabels.length) {
    await Seat.updateMany(
      { booking: booking._id },
      { $set: { status: 'available', booking: null, holdExpiresAt: null } }
    );
    booking.status = 'expired';
    await booking.save();

    const err = new Error('Some selected seats are no longer available');
    err.statusCode = 409;
    throw err;
  }

  emitSeatUpdate(
    show._id,
    normalizedLabels.map((label) => ({ label, status: 'held' }))
  );

  return booking;
};

/**
 * releaseHold(userId, bookingId)
 */
export const releaseHold = async (userId, bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  if (booking.user.toString() !== userId.toString()) {
    const err = new Error('Not authorised to release this booking hold');
    err.statusCode = 403;
    throw err;
  }

  if (booking.status !== 'pending') {
    const err = new Error(`Cannot release booking with status "${booking.status}"`);
    err.statusCode = 400;
    throw err;
  }

  await Seat.updateMany(
    { booking: booking._id, status: 'held' },
    { $set: { status: 'available', booking: null, holdExpiresAt: null } }
  );

  booking.status = 'expired';
  await booking.save();

  emitSeatUpdate(
    booking.show,
    booking.seats.map((label) => ({ label, status: 'available' }))
  );

  return booking;
};

/**
 * confirmBooking(bookingId)
 * Reserved for finalizePayment in Phase 7.
 */
export const confirmBooking = async (bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  if (booking.status !== 'pending') {
    const err = new Error(`Booking cannot be confirmed (current status: ${booking.status})`);
    err.statusCode = 400;
    throw err;
  }

  if (new Date() > new Date(booking.holdExpiresAt)) {
    booking.status = 'expired';
    await booking.save();
    await Seat.updateMany(
      { booking: booking._id, status: 'held' },
      { $set: { status: 'available', booking: null, holdExpiresAt: null } }
    );
    emitSeatUpdate(
      booking.show,
      booking.seats.map((label) => ({ label, status: 'available' }))
    );
    const err = new Error('Hold expired');
    err.statusCode = 410;
    throw err;
  }

  const updateResult = await Seat.updateMany(
    {
      booking: booking._id,
      status: 'held',
    },
    {
      $set: {
        status: 'booked',
        holdExpiresAt: null,
      },
    }
  );

  if (updateResult.modifiedCount !== booking.seats.length) {
    // Roll back: free every seat tied to this booking (held or already flipped to
    // booked) so no seat stays stuck against a booking that will never confirm.
    await Seat.updateMany(
      { booking: booking._id, status: { $in: ['held', 'booked'] } },
      { $set: { status: 'available', booking: null, holdExpiresAt: null } }
    );
    booking.status = 'expired';
    await booking.save();
    emitSeatUpdate(
      booking.show,
      booking.seats.map((label) => ({ label, status: 'available' }))
    );
    const err = new Error('Seat confirmation failed due to state conflict');
    err.statusCode = 409;
    throw err;
  }

  const randomChars = crypto.randomBytes(4).toString('hex').toUpperCase();
  const bookingCode = `IM${randomChars}`;

  booking.status = 'confirmed';
  booking.confirmedAt = new Date();
  booking.bookingCode = bookingCode;
  await booking.save();

  emitSeatUpdate(
    booking.show,
    booking.seats.map((label) => ({ label, status: 'booked' }))
  );

  return booking;
};

/**
 * cancelBooking(userId, bookingId, isAdmin)
 * Resolves Phase 7 TODO: triggers Razorpay refund via refundBooking.
 */
export const cancelBooking = async (userId, bookingId, isAdmin = false) => {
  const CANCEL_BEFORE_HOURS = parseInt(process.env.CANCEL_BEFORE_HOURS || '2', 10);

  const booking = await Booking.findById(bookingId).populate('show');
  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  if (!isAdmin && booking.user.toString() !== userId.toString()) {
    const err = new Error('Not authorised to cancel this booking');
    err.statusCode = 403;
    throw err;
  }

  if (booking.status !== 'confirmed') {
    const err = new Error(`Only confirmed bookings can be cancelled (status is ${booking.status})`);
    err.statusCode = 400;
    throw err;
  }

  if (!isAdmin) {
    const showStart = new Date(booking.show.startTime);
    const cutoff = new Date(Date.now() + CANCEL_BEFORE_HOURS * 60 * 60 * 1000);
    if (showStart < cutoff) {
      const err = new Error(
        `Bookings cannot be cancelled less than ${CANCEL_BEFORE_HOURS} hours before show time`
      );
      err.statusCode = 400;
      throw err;
    }
  }

  // Atomic transition: only one concurrent cancel request can win this update
  const claimed = await Booking.findOneAndUpdate(
    { _id: booking._id, status: 'confirmed' },
    { $set: { status: 'cancelled', cancelledAt: new Date() } },
    { new: true }
  );
  if (!claimed) {
    const err = new Error('Booking is already cancelled or no longer confirmed');
    err.statusCode = 409;
    throw err;
  }
  booking.status = claimed.status;
  booking.cancelledAt = claimed.cancelledAt;

  // Release seats
  await Seat.updateMany(
    { booking: booking._id, status: 'booked' },
    { $set: { status: 'available', booking: null, holdExpiresAt: null } }
  );

  emitSeatUpdate(
    booking.show._id,
    booking.seats.map((label) => ({ label, status: 'available' }))
  );

  // Notify cancellation
  await Notification.create({
    user: booking.user,
    type: 'booking_cancelled',
    message: `Your booking (${booking.bookingCode || booking._id}) has been successfully cancelled.`,
    booking: booking._id,
  });

  // Process Razorpay refund
  const refundResult = await refundBooking(booking);

  return {
    booking,
    refund: refundResult,
  };
};

/**
 * releaseExpiredHolds()
 */
export const releaseExpiredHolds = async () => {
  const now = new Date();

  const expiredSeats = await Seat.find(
    {
      status: 'held',
      holdExpiresAt: { $lt: now },
    },
    '_id show label'
  );

  if (expiredSeats.length > 0) {
    const expiredSeatIds = expiredSeats.map((s) => s._id);

    await Seat.updateMany(
      {
        _id: { $in: expiredSeatIds },
        status: 'held',
        holdExpiresAt: { $lt: now },
      },
      {
        $set: {
          status: 'available',
          booking: null,
          holdExpiresAt: null,
        },
      }
    );

    const showMap = new Map();
    for (const seat of expiredSeats) {
      const showIdStr = seat.show.toString();
      if (!showMap.has(showIdStr)) {
        showMap.set(showIdStr, []);
      }
      showMap.get(showIdStr).push({ label: seat.label, status: 'available' });
    }

    for (const [showIdStr, seats] of showMap.entries()) {
      emitSeatUpdate(showIdStr, seats);
    }
  }

  await Booking.updateMany(
    {
      status: 'pending',
      holdExpiresAt: { $lt: now },
    },
    {
      $set: {
        status: 'expired',
      },
    }
  );

  const affectedShows = [...new Set(expiredSeats.map((s) => s.show.toString()))];
  return affectedShows;
};
