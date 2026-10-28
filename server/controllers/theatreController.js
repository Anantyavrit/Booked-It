import Theatre from '../models/Theatre.js';
import Show from '../models/Show.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  parsePagination,
  buildPaginationMeta,
  escapeRegex,
} from '../utils/queryHelpers.js';

// ─────────────────────────────────────────────────────────────────────────────
// @desc    List theatres with city and search filters + pagination
// @route   GET /api/theatres
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
export const getTheatres = asyncHandler(async (req, res) => {
  const { city, search, includeInactive } = req.query;

  const filter = {};

  // Admin optional inclusion of inactive theatres
  const isAdmin = req.user && req.user.role === 'admin';
  if (!(isAdmin && includeInactive === 'true')) {
    filter.isActive = true;
  }

  // City filter (case-insensitive exact match)
  if (city) {
    filter.city = { $regex: new RegExp(`^${escapeRegex(city.trim())}$`, 'i') };
  }

  // Search filter (matches name or city, case-insensitive partial match)
  if (search && search.trim()) {
    const searchRegex = { $regex: escapeRegex(search.trim()), $options: 'i' };
    filter.$or = [{ name: searchRegex }, { city: searchRegex }];
  }

  const { page, limit, skip } = parsePagination(req.query);

  const [total, theatres] = await Promise.all([
    Theatre.countDocuments(filter),
    Theatre.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
  ]);

  res.json({
    success: true,
    pagination: buildPaginationMeta(total, page, limit),
    data: theatres,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get sorted distinct cities of active theatres with metadata
// @route   GET /api/theatres/cities
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
export const getCities = asyncHandler(async (_req, res) => {
  const POPULAR_CITIES = new Set([
    'Mumbai',
    'Delhi NCR',
    'Bengaluru',
    'Hyderabad',
    'Chennai',
    'Kolkata',
    'Pune',
    'Ahmedabad',
  ]);

  const cityAggregation = await Theatre.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$city',
        state: { $first: '$state' },
        theatreCount: { $sum: 1 },
      },
    },
    { $sort: { theatreCount: -1, _id: 1 } },
  ]);

  const result = cityAggregation
    .filter((c) => Boolean(c._id))
    .map((c) => ({
      city: c._id,
      state: c.state || '',
      theatreCount: c.theatreCount,
      isPopular: POPULAR_CITIES.has(c._id),
    }));

  res.json({
    success: true,
    data: result,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get nearby theatres by location (lat, lng, radius)
// @route   GET /api/theatres/nearby
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
export const getNearbyTheatres = asyncHandler(async (req, res) => {
  const { lat, lng, radius } = req.query;

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    res.status(400);
    throw new Error('lat and lng are required query parameters and must be valid numbers');
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    res.status(400);
    throw new Error('lat must be between -90 and 90, lng between -180 and 180');
  }

  let maxDistance = 50000; // default 50km
  if (radius) {
    const r = parseFloat(radius);
    if (!isNaN(r) && r > 0) {
      maxDistance = r <= 150 ? r * 1000 : r;
    }
  }

  const theatres = await Theatre.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        distanceField: 'distance',
        maxDistance: maxDistance,
        query: { isActive: true },
        spherical: true,
      },
    },
    { $sort: { distance: 1 } },
  ]);

  res.json({
    success: true,
    data: theatres,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get single theatre
// @route   GET /api/theatres/:id
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
export const getTheatre = asyncHandler(async (req, res) => {
  const theatre = await Theatre.findById(req.params.id);
  if (!theatre) {
    res.status(404);
    throw new Error('Theatre not found');
  }
  res.json({ success: true, data: theatre });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Create a theatre (admin)
// @route   POST /api/theatres
// @access  Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
export const createTheatre = asyncHandler(async (req, res) => {
  const { name, city, address, screens } = req.body;

  const errors = [];
  if (!name?.trim()) errors.push('Theatre name is required');
  if (!city?.trim()) errors.push('City is required');
  if (!address?.trim()) errors.push('Address is required');
  if (!Array.isArray(screens) || screens.length === 0) {
    errors.push('At least one screen is required');
  }

  if (Array.isArray(screens)) {
    const names = screens.map((s) => s?.name);
    if (new Set(names).size !== names.length) {
      errors.push('Screen names must be unique within a theatre');
    }
    screens.forEach((s, i) => {
      if (!s?.name?.trim()) errors.push(`Screen ${i + 1}: name is required`);
      if (!s?.rows || s.rows < 1 || s.rows > 26)
        errors.push(`Screen ${i + 1}: rows must be between 1 and 26`);
      if (!s?.seatsPerRow || s.seatsPerRow < 1 || s.seatsPerRow > 40)
        errors.push(`Screen ${i + 1}: seatsPerRow must be between 1 and 40`);
    });
  }

  if (errors.length > 0) {
    res.status(400);
    throw new Error(errors.join('. '));
  }

  const theatre = await Theatre.create({ name, city, address, screens });
  res.status(201).json({ success: true, data: theatre });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Update a theatre (admin)
// @route   PUT /api/theatres/:id
// @access  Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
export const updateTheatre = asyncHandler(async (req, res) => {
  const theatre = await Theatre.findById(req.params.id);
  if (!theatre) {
    res.status(404);
    throw new Error('Theatre not found');
  }

  const { name, city, address, screens, isActive } = req.body;

  if (Array.isArray(screens)) {
    const now = new Date();
    const existingMap = Object.fromEntries(theatre.screens.map((s) => [s.name, s]));
    const newNames = screens.map((s) => s?.name).filter(Boolean);

    for (const existing of theatre.screens) {
      if (!newNames.includes(existing.name)) {
        const count = await Show.countDocuments({
          theatre: theatre._id,
          screenName: existing.name,
          startTime: { $gt: now },
        });
        if (count > 0) {
          res.status(400);
          throw new Error(
            `Cannot remove screen "${existing.name}": it has ${count} upcoming show(s). Cancel or move them first.`
          );
        }
      }
    }

    for (const incoming of screens) {
      const old = existingMap[incoming?.name];
      if (old) {
        const resized =
          (incoming.rows !== undefined && Number(incoming.rows) !== old.rows) ||
          (incoming.seatsPerRow !== undefined && Number(incoming.seatsPerRow) !== old.seatsPerRow);

        if (resized) {
          const count = await Show.countDocuments({
            theatre: theatre._id,
            screenName: old.name,
            startTime: { $gt: now },
          });
          if (count > 0) {
            res.status(400);
            throw new Error(
              `Cannot resize screen "${old.name}": it has ${count} upcoming show(s). Resizing would affect booked seats.`
            );
          }
        }
      }
    }

    if (new Set(newNames).size !== newNames.length) {
      res.status(400);
      throw new Error('Screen names must be unique within a theatre');
    }
  }

  if (name !== undefined) theatre.name = name.trim();
  if (city !== undefined) theatre.city = city.trim();
  if (address !== undefined) theatre.address = address.trim();
  if (screens !== undefined) theatre.screens = screens;
  if (isActive !== undefined) theatre.isActive = isActive;

  const updated = await theatre.save();
  res.json({ success: true, data: updated });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Delete a theatre (admin)
// @route   DELETE /api/theatres/:id
// @access  Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
export const deleteTheatre = asyncHandler(async (req, res) => {
  const theatre = await Theatre.findById(req.params.id);
  if (!theatre) {
    res.status(404);
    throw new Error('Theatre not found');
  }

  const upcomingCount = await Show.countDocuments({
    theatre: theatre._id,
    startTime: { $gt: new Date() },
  });
  if (upcomingCount > 0) {
    res.status(400);
    throw new Error(
      `Cannot delete: this theatre has ${upcomingCount} upcoming show(s). Remove them first.`
    );
  }

  await theatre.deleteOne();
  res.json({ success: true, message: 'Theatre deleted successfully' });
});
