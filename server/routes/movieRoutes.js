import express from 'express';
import {
  getMovies,
  getMovieFilters,
  getMovieShowsGroupedByTheatre,
  getMovie,
  createMovie,
  updateMovie,
  deleteMovie,
} from '../controllers/movieController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { posterUpload } from '../utils/multerConfig.js';
import validateObjectId from '../middleware/validateObjectId.js';

const router = express.Router();

// Public listing with search, filtering, pagination (optional auth for includeInactive)
router.get('/', optionalAuth, getMovies);

// Filter values for active movies (placed before /:id)
router.get('/filters', getMovieFilters);

// Shows of a specific movie grouped by theatre (placed before /:id)
router.get('/:id/shows', validateObjectId(), getMovieShowsGroupedByTheatre);

// Single movie
router.get('/:id', validateObjectId(), getMovie);

// Admin only routes
router.post(
  '/',
  protect,
  authorizeRoles('admin'),
  posterUpload,
  createMovie
);

router.put(
  '/:id',
  protect,
  authorizeRoles('admin'),
  validateObjectId(),
  posterUpload,
  updateMovie
);

router.delete(
  '/:id',
  protect,
  authorizeRoles('admin'),
  validateObjectId(),
  deleteMovie
);

export default router;
