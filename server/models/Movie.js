import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Movie title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    genres: {
      type: [String],
      validate: {
        validator: (v) => Array.isArray(v) && v.length >= 1,
        message: 'At least one genre is required',
      },
    },
    languages: {
      type: [String],
      validate: {
        validator: (v) => Array.isArray(v) && v.length >= 1,
        message: 'At least one language is required',
      },
    },
    duration: {
      type: Number,
      required: [true, 'Duration (in minutes) is required'],
      min: [30, 'Duration must be at least 30 minutes'],
      max: [300, 'Duration cannot exceed 300 minutes'],
    },
    releaseDate: { type: Date },
    certificate: {
      type: String,
      enum: { values: ['U', 'UA', 'A'], message: 'Certificate must be U, UA, or A' },
    },
    cast:     { type: [String], default: [] },
    director: { type: String, default: '', trim: true },
    tagline:  { type: String, default: '', trim: true },
    backdrop: { type: String, default: '', trim: true },
    poster:   { type: String, default: '' },
    trailerUrl: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator: function (v) {
          if (!v) return true;
          try {
            const url = new URL(v);
            return url.protocol === 'http:' || url.protocol === 'https:';
          } catch {
            return false;
          }
        },
        message: 'trailerUrl must be a valid HTTP or HTTPS URL',
      },
    },
    status: {
      type: String,
      enum: ['now_showing', 'coming_soon', 'archived'],
      default: 'now_showing',
    },
    formats: {
      type: [String],
      enum: ['2D', '3D', 'IMAX', '4DX'],
      default: ['2D'],
    },
    rating: {
      type: Number,
      min: [0, 'Rating cannot be less than 0'],
      max: [10, 'Rating cannot exceed 10'],
      default: null,
    },
    tmdbId: {
      type: Number,
      unique: true,
      sparse: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Efficient queries for the public movie listing & status filtering
movieSchema.index({ isActive: 1, releaseDate: -1 });
movieSchema.index({ status: 1, releaseDate: -1 });

const Movie = mongoose.model('Movie', movieSchema);
export default Movie;
