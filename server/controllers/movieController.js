import mongoose from 'mongoose';
import Movie from '../models/Movie.js';
import Show from '../models/Show.js';
import Theatre from '../models/Theatre.js';
import asyncHandler from '../utils/asyncHandler.js';
import { deleteFile } from '../utils/fileHelper.js';
import {
  parsePagination,
  buildPaginationMeta,
  escapeRegex,
  parseISTDateRange,
} from '../utils/queryHelpers.js';

// ── Helper: parse comma-separated OR repeated multipart array fields ──────────
const parseArrayField = (field) => {
  if (!field) return [];
  if (Array.isArray(field)) return field.map((v) => v.trim()).filter(Boolean);
  return String(field).split(',').map((v) => v.trim()).filter(Boolean);
};

// ── Helper: resolve poster value from request ─────────────────────────────────
const resolvePoster = (req, existingPoster = '') => {
  if (req.file) {
    if (existingPoster && !existingPoster.startsWith('http')) {
      deleteFile(existingPoster);
    }
    return `/uploads/${req.file.filename}`;
  }
  if (req.body.poster && req.body.poster.startsWith('http')) {
    if (existingPoster && !existingPoster.startsWith('http')) {
      deleteFile(existingPoster);
    }
    return req.body.poster;
  }
  return existingPoster;
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    List movies with search, filters, pagination
// @route   GET /api/movies
// @access  Public (Optional Admin for includeInactive)
// ─────────────────────────────────────────────────────────────────────────────
export const getMovies = asyncHandler(async (req, res) => {
  const {
    search,
    genre,
    language,
    certificate,
    city,
    theatre,
    date,
    sort,
    includeInactive,
  } = req.query;

  const filter = {};

  // Admin optional inclusion of inactive movies
  const isAdmin = req.user && req.user.role === 'admin';
  if (!(isAdmin && includeInactive === 'true')) {
    filter.isActive = true;
  }

  // 1. Title search (case-insensitive escaped regex)
  if (search) {
    filter.title = { $regex: escapeRegex(search.trim()), $options: 'i' };
  }

  // 2. Genre filter (exact match in array, case-insensitive)
  if (genre) {
    filter.genres = { $regex: new RegExp(`^${escapeRegex(genre.trim())}$`, 'i') };
  }

  // 3. Language filter (match in array, case-insensitive)
  if (language) {
    filter.languages = { $regex: new RegExp(`^${escapeRegex(language.trim())}$`, 'i') };
  }

  // 4. Certificate filter (U, UA, A)
  if (certificate) {
    filter.certificate = certificate.trim().toUpperCase();
  }

  // 5. City, Theatre, Date filters via upcoming shows
  if (city || theatre || date) {
    const showFilter = {};

    // Validate theatre id if provided
    if (theatre) {
      if (!mongoose.Types.ObjectId.isValid(theatre)) {
        res.status(400);
        throw new Error(`Invalid theatre id: "${theatre}"`);
      }
      showFilter.theatre = new mongoose.Types.ObjectId(theatre);
    }

    // Resolve theatres in city if city provided
    if (city) {
      const matchingTheatres = await Theatre.find({
        city: { $regex: new RegExp(`^${escapeRegex(city.trim())}$`, 'i') },
        isActive: true,
      }).select('_id');
      const theatreIds = matchingTheatres.map((t) => t._id);

      if (showFilter.theatre) {
        // If both theatre and city are given, ensure the theatre is in that city
        const isMatch = theatreIds.some((id) => id.equals(showFilter.theatre));
        if (!isMatch) {
          showFilter.theatre = new mongoose.Types.ObjectId(); // force empty match
        }
      } else {
        showFilter.theatre = { $in: theatreIds };
      }
    }

    // Date range filter
    const now = new Date();
    if (date) {
      const { start, end } = parseISTDateRange(date);
      // Only upcoming shows within date range
      const effectiveStart = start > now ? start : now;
      showFilter.startTime = { $gte: effectiveStart, $lt: end };
    } else {
      showFilter.startTime = { $gte: now };
    }

    // Efficiently get distinct movie IDs from shows
    const movieIds = await Show.distinct('movie', showFilter);
    filter._id = { $in: movieIds };
  }

  // Sorting
  let sortOption = { releaseDate: -1, createdAt: -1 }; // default: newest
  if (sort === 'title') {
    sortOption = { title: 1 };
  } else if (sort === 'duration') {
    sortOption = { duration: 1 };
  } else if (sort === 'newest') {
    sortOption = { releaseDate: -1, createdAt: -1 };
  }

  // Pagination
  const { page, limit, skip } = parsePagination(req.query);

  const [total, movies] = await Promise.all([
    Movie.countDocuments(filter),
    Movie.find(filter).sort(sortOption).skip(skip).limit(limit),
  ]);

  res.json({
    success: true,
    pagination: buildPaginationMeta(total, page, limit),
    data: movies,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get filter options (genres, languages, certificates) from active movies
// @route   GET /api/movies/filters
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
export const getMovieFilters = asyncHandler(async (_req, res) => {
  const [genres, languages, certificates] = await Promise.all([
    Movie.distinct('genres', { isActive: true }),
    Movie.distinct('languages', { isActive: true }),
    Movie.distinct('certificate', { isActive: true, certificate: { $ne: null } }),
  ]);

  res.json({
    success: true,
    data: {
      genres: genres.filter(Boolean).sort((a, b) => a.localeCompare(b)),
      languages: languages.filter(Boolean).sort((a, b) => a.localeCompare(b)),
      certificates: certificates.filter(Boolean).sort(),
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get upcoming shows of one movie grouped by theatre
// @route   GET /api/movies/:id/shows
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
export const getMovieShowsGroupedByTheatre = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { city, date } = req.query;

  const movie = await Movie.findById(id);
  if (!movie) {
    res.status(404);
    throw new Error('Movie not found');
  }

  const showFilter = {
    movie: movie._id,
  };

  const now = new Date();
  if (date) {
    const { start, end } = parseISTDateRange(date);
    const effectiveStart = start > now ? start : now;
    showFilter.startTime = { $gte: effectiveStart, $lt: end };
  } else {
    showFilter.startTime = { $gte: now };
  }

  if (city) {
    const matchingTheatres = await Theatre.find({
      city: { $regex: new RegExp(`^${escapeRegex(city.trim())}$`, 'i') },
      isActive: true,
    }).select('_id');
    showFilter.theatre = { $in: matchingTheatres.map((t) => t._id) };
  }

  const shows = await Show.find(showFilter)
    .sort({ startTime: 1 })
    .populate('theatre', '_id name city address isActive');

  // Filter out shows whose theatre is inactive
  const activeShows = shows.filter((s) => s.theatre && s.theatre.isActive !== false);

  // Group shows by theatre
  const theatreMap = new Map();
  for (const s of activeShows) {
    const tId = s.theatre._id.toString();
    if (!theatreMap.has(tId)) {
      theatreMap.set(tId, {
        theatre: {
          _id: s.theatre._id,
          name: s.theatre.name,
          city: s.theatre.city,
          address: s.theatre.address,
        },
        shows: [],
      });
    }

    theatreMap.get(tId).shows.push({
      _id: s._id,
      screenName: s.screenName,
      language: s.language,
      startTime: s.startTime,
      endTime: s.endTime,
      price: s.price,
    });
  }

  // Convert to array and sort theatres by name
  const result = Array.from(theatreMap.values()).sort((a, b) =>
    a.theatre.name.localeCompare(b.theatre.name)
  );

  res.json({
    success: true,
    data: result,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get single movie
// @route   GET /api/movies/:id
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
export const getMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) {
    res.status(404);
    throw new Error('Movie not found');
  }
  res.json({ success: true, data: movie });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Create a movie (admin)
// @route   POST /api/movies
// @access  Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
export const createMovie = asyncHandler(async (req, res) => {
  const { title, description, duration, releaseDate, certificate, trailerUrl } = req.body;

  const genres = parseArrayField(req.body.genres);
  const languages = parseArrayField(req.body.languages);
  const cast = parseArrayField(req.body.cast);

  const errors = [];
  if (!title?.trim()) errors.push('Title is required');
  if (!description?.trim()) errors.push('Description is required');
  if (!duration || isNaN(duration)) errors.push('Duration (minutes) is required');
  if (duration < 30 || duration > 300) errors.push('Duration must be between 30 and 300 minutes');
  if (genres.length === 0) errors.push('At least one genre is required');
  if (languages.length === 0) errors.push('At least one language is required');
  if (certificate && !['U', 'UA', 'A'].includes(certificate)) {
    errors.push('Certificate must be U, UA, or A');
  }
  if (trailerUrl && typeof trailerUrl === 'string' && trailerUrl.trim()) {
    try {
      const parsedUrl = new URL(trailerUrl.trim());
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        errors.push('Trailer URL must be a valid HTTP or HTTPS URL');
      }
    } catch {
      errors.push('Trailer URL must be a valid HTTP or HTTPS URL');
    }
  }
  if (errors.length > 0) {
    if (req.file) deleteFile(`/uploads/${req.file.filename}`);
    res.status(400);
    throw new Error(errors.join('. '));
  }

  const poster = resolvePoster(req);

  const movie = await Movie.create({
    title: title.trim(),
    description: description.trim(),
    genres,
    languages,
    duration: Number(duration),
    releaseDate: releaseDate || undefined,
    certificate: certificate || undefined,
    cast,
    poster,
    trailerUrl: trailerUrl ? trailerUrl.trim() : '',
  });

  res.status(201).json({ success: true, data: movie });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Update a movie (admin)
// @route   PUT /api/movies/:id
// @access  Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
export const updateMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) {
    if (req.file) deleteFile(`/uploads/${req.file.filename}`);
    res.status(404);
    throw new Error('Movie not found');
  }

  const genres = parseArrayField(req.body.genres);
  const languages = parseArrayField(req.body.languages);
  const cast = parseArrayField(req.body.cast);

  const { title, description, duration, releaseDate, certificate, isActive, trailerUrl } = req.body;

  const errors = [];
  if (duration !== undefined && (isNaN(duration) || duration < 30 || duration > 300)) {
    errors.push('Duration must be between 30 and 300 minutes');
  }
  if (certificate && !['U', 'UA', 'A'].includes(certificate)) {
    errors.push('Certificate must be U, UA, or A');
  }
  if (req.body.genres !== undefined && genres.length === 0) {
    errors.push('At least one genre is required');
  }
  if (req.body.languages !== undefined && languages.length === 0) {
    errors.push('At least one language is required');
  }
  if (trailerUrl !== undefined && trailerUrl !== '' && trailerUrl !== null) {
    try {
      const parsedUrl = new URL(String(trailerUrl).trim());
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        errors.push('Trailer URL must be a valid HTTP or HTTPS URL');
      }
    } catch {
      errors.push('Trailer URL must be a valid HTTP or HTTPS URL');
    }
  }
  if (errors.length > 0) {
    if (req.file) deleteFile(`/uploads/${req.file.filename}`);
    res.status(400);
    throw new Error(errors.join('. '));
  }

  const poster = resolvePoster(req, movie.poster);

  if (title !== undefined) movie.title = title.trim();
  if (description !== undefined) movie.description = description.trim();
  if (req.body.genres !== undefined) movie.genres = genres;
  if (req.body.languages !== undefined) movie.languages = languages;
  if (req.body.cast !== undefined) movie.cast = cast;
  if (duration !== undefined) movie.duration = Number(duration);
  if (releaseDate !== undefined) movie.releaseDate = releaseDate;
  if (certificate !== undefined) movie.certificate = certificate;
  if (isActive !== undefined) movie.isActive = isActive === 'true' || isActive === true;
  if (trailerUrl !== undefined) movie.trailerUrl = trailerUrl ? String(trailerUrl).trim() : '';
  movie.poster = poster;

  const updated = await movie.save();
  res.json({ success: true, data: updated });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Delete a movie (admin)
// @route   DELETE /api/movies/:id
// @access  Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
export const deleteMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) {
    res.status(404);
    throw new Error('Movie not found');
  }

  const upcomingCount = await Show.countDocuments({
    movie: movie._id,
    startTime: { $gt: new Date() },
  });
  if (upcomingCount > 0) {
    res.status(400);
    throw new Error(
      `Cannot delete: this movie has ${upcomingCount} upcoming show(s). Remove or reschedule them first.`
    );
  }

  if (movie.poster) deleteFile(movie.poster);

  await movie.deleteOne();
  res.json({ success: true, message: 'Movie deleted successfully' });
});
