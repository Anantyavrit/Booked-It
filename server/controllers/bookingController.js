import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  holdSeats,
  releaseHold,
  cancelBooking,
} from '../services/bookingService.js';
import { parsePagination, buildPaginationMeta } from '../utils/queryHelpers.js';

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Hold seats for user
// @route   POST /api/bookings/hold
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
export const createHold = asyncHandler(async (req, res) => {
  const { showId, seats } = req.body;

  if (!showId) {
    res.status(400);
    throw new Error('showId is required');
  }

  const booking = await holdSeats(req.user._id, showId, seats);

  res.status(201).json({
    success: true,
    data: {
      _id: booking._id,
      seats: booking.seats,
      amount: booking.amount,
      holdExpiresAt: booking.holdExpiresAt,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Release held seats
// @route   DELETE /api/bookings/:id/hold
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
export const releaseBookingHold = asyncHandler(async (req, res) => {
  const booking = await releaseHold(req.user._id, req.params.id);

  res.json({
    success: true,
    message: 'Hold released successfully',
    data: booking,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Cancel a booking
// @route   POST /api/bookings/:id/cancel
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
export const cancelUserBooking = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const result = await cancelBooking(req.user._id, req.params.id, isAdmin);

  res.json({
    success: true,
    message: 'Booking cancelled successfully',
    data: result.booking,
    refund: result.refund,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get user's confirmed and cancelled bookings
// @route   GET /api/bookings/my
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
export const getMyBookings = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const filter = {
    user: req.user._id,
    status: { $in: ['confirmed', 'cancelled'] },
  };

  const { page, limit, skip } = parsePagination(req.query);

  let bookings = await Booking.find(filter)
    .sort({ createdAt: -1 })
    .populate({
      path: 'show',
      populate: [
        { path: 'movie', select: 'title poster duration' },
        { path: 'theatre', select: 'name city address' },
      ],
    });

  const now = new Date();
  if (type === 'upcoming') {
    bookings = bookings.filter((b) => b.show && new Date(b.show.startTime) >= now);
  } else if (type === 'past') {
    bookings = bookings.filter((b) => b.show && new Date(b.show.startTime) < now);
  }

  const total = bookings.length;
  const paginated = bookings.slice(skip, skip + limit);

  res.json({
    success: true,
    pagination: buildPaginationMeta(total, page, limit),
    data: paginated,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get single booking (owner or admin)
// @route   GET /api/bookings/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
export const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate({
    path: 'show',
    populate: [
      { path: 'movie', select: 'title poster duration' },
      { path: 'theatre', select: 'name city address' },
    ],
  });

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  const isOwner = booking.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    res.status(403);
    throw new Error('Not authorised to access this booking');
  }

  res.json({
    success: true,
    data: booking,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Admin: Get all bookings with filters and pagination
// @route   GET /api/bookings
// @access  Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
export const getAllBookings = asyncHandler(async (req, res) => {
  const { show, status, user } = req.query;
  const filter = {};

  if (show) {
    if (!mongoose.Types.ObjectId.isValid(show)) {
      res.status(400);
      throw new Error(`Invalid show id: "${show}"`);
    }
    filter.show = new mongoose.Types.ObjectId(show);
  }

  if (status) {
    filter.status = status;
  }

  if (user) {
    if (!mongoose.Types.ObjectId.isValid(user)) {
      res.status(400);
      throw new Error(`Invalid user id: "${user}"`);
    }
    filter.user = new mongoose.Types.ObjectId(user);
  }

  const { page, limit, skip } = parsePagination(req.query);

  const [total, bookings] = await Promise.all([
    Booking.countDocuments(filter),
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email')
      .populate({
        path: 'show',
        populate: [
          { path: 'movie', select: 'title' },
          { path: 'theatre', select: 'name city' },
        ],
      }),
  ]);

  res.json({
    success: true,
    pagination: buildPaginationMeta(total, page, limit),
    data: bookings,
  });
});
