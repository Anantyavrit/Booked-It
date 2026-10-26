import mongoose from 'mongoose';
import Show from '../models/Show.js';
import Movie from '../models/Movie.js';
import Theatre from '../models/Theatre.js';
import Booking from '../models/Booking.js';
import Seat from '../models/Seat.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  parsePagination,
  buildPaginationMeta,
  escapeRegex,
  parseISTDateRange,
} from '../utils/queryHelpers.js';
import { generateSeatsForShow } from '../services/bookingService.js';

// ── Helper: check if two time windows overlap ─────────────────────────────────
const checkOverlap = async (theatreId, screenName, newStart, newEnd, excludeId = null) => {
  const query = {
    theatre: theatreId,
    screenName,
    startTime: { $lt: newEnd },
    endTime: { $gt: newStart },
  };
  if (excludeId) query._id = { $ne: excludeId };
  return Show.findOne(query).populate('movie', 'title');
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    List upcoming shows with filters (movie, theatre, city, language, date) + pagination
// @route   GET /api/shows
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
export const getShows = asyncHandler(async (req, res) => {
  const { movie, theatre, city, language, date, includePast, sort } = req.query;

  const isAdmin = req.user && req.user.role === 'admin';
  const shouldIncludePast = isAdmin && includePast === 'true';

  const filter = {};

  if (movie) {
    if (!mongoose.Types.ObjectId.isValid(movie)) {
      res.status(400);
      throw new Error(`Invalid movie id: "${movie}"`);
    }
    filter.movie = new mongoose.Types.ObjectId(movie);
  }

  if (theatre) {
    if (!mongoose.Types.ObjectId.isValid(theatre)) {
      res.status(400);
      throw new Error(`Invalid theatre id: "${theatre}"`);
    }
    filter.theatre = new mongoose.Types.ObjectId(theatre);
  }

  if (city) {
    const matchingTheatres = await Theatre.find({
      city: { $regex: new RegExp(`^${escapeRegex(city.trim())}$`, 'i') },
      isActive: true,
    }).select('_id');
    const theatreIds = matchingTheatres.map((t) => t._id);

    if (filter.theatre) {
      const match = theatreIds.some((id) => id.equals(filter.theatre));
      if (!match) {
        filter.theatre = new mongoose.Types.ObjectId();
      }
    } else {
      filter.theatre = { $in: theatreIds };
    }
  }

  if (language) {
    filter.language = { $regex: new RegExp(`^${escapeRegex(language.trim())}$`, 'i') };
  }

  const now = new Date();
  if (date) {
    const { start, end } = parseISTDateRange(date);
    const effectiveStart = shouldIncludePast ? start : (start > now ? start : now);
    filter.startTime = { $gte: effectiveStart, $lt: end };
  } else if (!shouldIncludePast) {
    filter.startTime = { $gte: now };
  }

  const { page, limit, skip } = parsePagination(req.query);

  const sortDirection = shouldIncludePast ? (sort === 'asc' ? 1 : -1) : 1;

  const [total, shows] = await Promise.all([
    Show.countDocuments(filter),
    Show.find(filter)
      .sort({ startTime: sortDirection })
      .skip(skip)
      .limit(limit)
      .populate('movie', 'title poster duration certificate')
      .populate('theatre', 'name city'),
  ]);

  res.json({
    success: true,
    pagination: buildPaginationMeta(total, page, limit),
    data: shows,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get single show (with screen layout)
// @route   GET /api/shows/:id
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
export const getShow = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id)
    .populate('movie', 'title poster duration certificate languages genres cast')
    .populate('theatre', 'name city address screens');

  if (!show) {
    res.status(404);
    throw new Error('Show not found');
  }

  const screen = show.theatre.screens.find((s) => s.name === show.screenName) || null;

  res.json({
    success: true,
    data: { ...show.toObject(), screen },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get show seats map
// @route   GET /api/shows/:id/seats
// @access  Public (optionalAuth)
// ─────────────────────────────────────────────────────────────────────────────
export const getShowSeats = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id).populate('theatre');
  if (!show) {
    res.status(404);
    throw new Error('Show not found');
  }

  const screen = show.theatre.screens.find((s) => s.name === show.screenName);
  if (!screen) {
    res.status(400);
    throw new Error('Screen layout not found for show');
  }

  // Ensure seats exist for this show
  await generateSeatsForShow(show);

  // Fetch all seats for this show
  const seats = await Seat.find({ show: show._id }).sort({ row: 1, number: 1 });

  const now = new Date();
  const currentUserId = req.user ? req.user._id.toString() : null;

  // If user is logged in, find their active pending booking for this show to identify 'isMine'
  let myPendingBookingId = null;
  if (currentUserId) {
    const myBooking = await Booking.findOne({
      user: req.user._id,
      show: show._id,
      status: 'pending',
      holdExpiresAt: { $gt: now },
    }).select('_id');
    if (myBooking) {
      myPendingBookingId = myBooking._id.toString();
    }
  }

  const formattedSeats = seats.map((seat) => {
    let effectiveStatus = seat.status;
    let isMine = false;

    if (seat.status === 'held') {
      if (seat.holdExpiresAt && new Date(seat.holdExpiresAt) < now) {
        effectiveStatus = 'available';
      } else if (
        myPendingBookingId &&
        seat.booking &&
        seat.booking.toString() === myPendingBookingId
      ) {
        isMine = true;
      }
    }

    return {
      label: seat.label,
      row: seat.row,
      number: seat.number,
      status: effectiveStatus,
      isMine,
    };
  });

  res.json({
    success: true,
    data: {
      layout: {
        rows: screen.rows,
        seatsPerRow: screen.seatsPerRow,
      },
      price: show.price,
      seats: formattedSeats,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Create a show (admin)
// @route   POST /api/shows
// @access  Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
export const createShow = asyncHandler(async (req, res) => {
  const { movie: movieId, theatre: theatreId, screenName, language, startTime, price } = req.body;

  const errors = [];
  if (!movieId) errors.push('Movie id is required');
  if (!theatreId) errors.push('Theatre id is required');
  if (!screenName?.trim()) errors.push('Screen name is required');
  if (!language?.trim()) errors.push('Language is required');
  if (!startTime) errors.push('Start time is required');
  if (price === undefined || price === null) errors.push('Price is required');
  if (price < 0) errors.push('Price cannot be negative');

  if (errors.length > 0) {
    res.status(400);
    throw new Error(errors.join('. '));
  }

  const [movie, theatre] = await Promise.all([
    Movie.findById(movieId),
    Theatre.findById(theatreId),
  ]);

  if (!movie) { res.status(404); throw new Error('Movie not found'); }
  if (!movie.isActive) { res.status(400); throw new Error('Movie is not active'); }
  if (!theatre) { res.status(404); throw new Error('Theatre not found'); }
  if (!theatre.isActive) { res.status(400); throw new Error('Theatre is not active'); }

  const screen = theatre.screens.find((s) => s.name === screenName);
  if (!screen) {
    res.status(400);
    throw new Error(
      `Screen "${screenName}" does not exist in theatre "${theatre.name}". Available: ${theatre.screens.map((s) => s.name).join(', ')}`
    );
  }

  if (!movie.languages.includes(language)) {
    res.status(400);
    throw new Error(
      `Language "${language}" is not available for this movie. Available: ${movie.languages.join(', ')}`
    );
  }

  const start = new Date(startTime);
  if (start <= new Date()) {
    res.status(400);
    throw new Error('Start time must be in the future');
  }

  const end = new Date(start.getTime() + (movie.duration + 15) * 60 * 1000);

  const overlap = await checkOverlap(theatreId, screenName, start, end);
  if (overlap) {
    res.status(409);
    throw new Error(
      `Schedule conflict: screen "${screenName}" already has a show "${overlap.movie?.title || 'Unknown'}" ` +
      `from ${overlap.startTime.toISOString()} to ${overlap.endTime.toISOString()}`
    );
  }

  const show = await Show.create({
    movie: movieId,
    theatre: theatreId,
    screenName,
    language,
    startTime: start,
    endTime: end,
    price: Number(price),
  });

  // Automatically generate seats for the new show
  await generateSeatsForShow(show);

  const populated = await show.populate([
    { path: 'movie', select: 'title poster duration' },
    { path: 'theatre', select: 'name city screens' },
  ]);

  res.status(201).json({ success: true, data: populated });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Update a show — only startTime, price, language (admin)
// @route   PUT /api/shows/:id
// @access  Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
export const updateShow = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id).populate('movie');
  if (!show) {
    res.status(404);
    throw new Error('Show not found');
  }

  // Refuse modifications if the show has confirmed bookings
  const confirmedCount = await Booking.countDocuments({
    show: show._id,
    status: 'confirmed',
  });
  if (confirmedCount > 0) {
    res.status(400);
    throw new Error(
      `Cannot modify show: ${confirmedCount} confirmed booking(s) exist for this show.`
    );
  }

  const { startTime, price, language } = req.body;

  if (language !== undefined) {
    if (!show.movie.languages.includes(language)) {
      res.status(400);
      throw new Error(
        `Language "${language}" is not available for this movie. Available: ${show.movie.languages.join(', ')}`
      );
    }
    show.language = language;
  }

  if (price !== undefined) {
    if (Number(price) < 0) { res.status(400); throw new Error('Price cannot be negative'); }
    show.price = Number(price);
  }

  if (startTime !== undefined) {
    const newStart = new Date(startTime);
    if (newStart <= new Date()) {
      res.status(400);
      throw new Error('Start time must be in the future');
    }

    const newEnd = new Date(newStart.getTime() + (show.movie.duration + 15) * 60 * 1000);

    const overlap = await checkOverlap(show.theatre, show.screenName, newStart, newEnd, show._id);
    if (overlap) {
      res.status(409);
      throw new Error(
        `Schedule conflict: screen "${show.screenName}" already has "${overlap.movie?.title || 'Unknown'}" ` +
        `from ${overlap.startTime.toISOString()} to ${overlap.endTime.toISOString()}`
      );
    }

    show.startTime = newStart;
    show.endTime = newEnd;
  }

  const updated = await show.save();
  res.json({ success: true, data: updated });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Delete a show (admin)
// @route   DELETE /api/shows/:id
// @access  Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
export const deleteShow = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id);
  if (!show) {
    res.status(404);
    throw new Error('Show not found');
  }

  const now = new Date();
  // Check for confirmed bookings or active pending bookings
  const activeBookingsCount = await Booking.countDocuments({
    show: show._id,
    $or: [
      { status: 'confirmed' },
      { status: 'pending', holdExpiresAt: { $gt: now } },
    ],
  });

  if (activeBookingsCount > 0) {
    res.status(400);
    throw new Error(
      `Cannot delete show: it has ${activeBookingsCount} active or confirmed booking(s).`
    );
  }

  // Delete associated seats
  await Seat.deleteMany({ show: show._id });

  await show.deleteOne();
  res.json({ success: true, message: 'Show and associated seats deleted successfully' });
});
