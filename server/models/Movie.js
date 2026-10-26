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
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Efficient queries for the public movie listing
movieSchema.index({ isActive: 1, releaseDate: -1 });

const Movie = mongoose.model('Movie', movieSchema);
export default Movie;
