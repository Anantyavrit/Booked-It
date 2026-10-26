import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Film, Clock, Calendar, Globe, Play, Users, ArrowLeft } from 'lucide-react';
import { movieApi } from '../api/movieApi.js';
import { useFetch } from '../hooks/useFetch.js';
import { useCity } from '../context/CityContext.jsx';
import { formatDuration, formatDate } from '../utils/format.js';
import ShowtimesSection from '../components/ShowtimesSection.jsx';
import TrailerModal from '../components/TrailerModal.jsx';
import ErrorState from '../components/ErrorState.jsx';

export default function MovieDetailPage() {
  const { id } = useParams();
  const { selectedCity } = useCity();
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  // 1. Fetch movie details
  const {
    data: movieData,
    loading: movieLoading,
    error: movieError,
    refetch: refetchMovie,
  } = useFetch(() => movieApi.getMovie(id), [id]);

  const movie = movieData?.data;

  // Set document title
  useEffect(() => {
    if (movie?.title) {
      document.title = `${movie.title} — Book Tickets | IMovies`;
    } else {
      document.title = 'Movie Details — IMovies';
    }
  }, [movie?.title]);

  // 2. Fetch shows grouped by theatre for this movie and selected city
  const {
    data: showsData,
    loading: showsLoading,
    error: showsError,
    refetch: refetchShows,
  } = useFetch(
    () => movieApi.getMovieShows(id, { city: selectedCity || undefined }),
    [id, selectedCity]
  );

  const groupedTheatres = showsData?.data || [];

  if (movieLoading) {
    return (
      <div className="space-y-8 py-8 animate-pulse">
        <div className="h-6 w-32 bg-neutral-900 rounded-lg" />
        <div className="aspect-[21/9] w-full bg-neutral-900 rounded-3xl" />
        <div className="h-40 bg-neutral-900 rounded-2xl w-full" />
      </div>
    );
  }

  if (movieError || !movie) {
    return (
      <div className="py-12">
        <ErrorState
          title="Movie Not Found"
          message={movieError || 'The movie you are looking for does not exist or has been removed.'}
          onRetry={refetchMovie}
        />
        <div className="text-center mt-6">
          <Link
            to="/movies"
            className="inline-flex items-center gap-2 text-xs font-semibold text-rose-400 hover:text-rose-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to movies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 py-6">
      {/* Back button */}
      <div>
        <Link
          to="/movies"
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all movies
        </Link>
      </div>

      {/* Movie Hero & Backdrop Layout */}
      <div className="relative rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-900/40 p-6 sm:p-10">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Poster */}
          <div className="w-48 sm:w-64 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 shadow-2xl relative">
            {!imgError && movie.poster ? (
              <img
                src={movie.poster}
                alt={movie.title}
                loading="lazy"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-neutral-900 text-neutral-400">
                <Film className="w-12 h-12 text-rose-500 mb-2" />
                <span className="text-sm font-semibold text-white">{movie.title}</span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {movie.certificate && (
                <span className="px-2.5 py-1 rounded-md bg-neutral-800 border border-neutral-700 text-xs font-bold text-neutral-200">
                  {movie.certificate}
                </span>
              )}
              {movie.genres?.map((genre) => (
                <span
                  key={genre}
                  className="px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-300"
                >
                  {genre}
                </span>
              ))}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {movie.title}
            </h1>

            {/* Quick Specs */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400 pt-1">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-rose-500" />
                {formatDuration(movie.duration)}
              </span>
              <span className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-amber-500" />
                {movie.languages?.join(', ')}
              </span>
              {movie.releaseDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  {formatDate(movie.releaseDate, { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>

            {/* Synopsis */}
            <div className="pt-2">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-neutral-400 mb-1.5">
                About the Movie
              </h3>
              <p className="text-sm text-neutral-300 leading-relaxed max-w-2xl">
                {movie.description}
              </p>
            </div>

            {/* Cast & Director */}
            {movie.cast && movie.cast.length > 0 && (
              <div className="pt-2">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-neutral-400 mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-rose-500" />
                  Starring Cast
                </h3>
                <p className="text-xs text-neutral-300">
                  {movie.cast.join(', ')}
                </p>
              </div>
            )}

            {/* Watch Trailer Button (only if trailerUrl exists) */}
            {movie.trailerUrl && (
              <div className="pt-3">
                <button
                  onClick={() => setTrailerOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs sm:text-sm font-semibold text-white border border-neutral-700 transition-all hover:scale-105"
                >
                  <Play className="w-4 h-4 text-rose-500 fill-rose-500" />
                  <span>Watch Trailer</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Showtimes Section */}
      <section className="space-y-4">
        {showsError ? (
          <ErrorState message={showsError} onRetry={refetchShows} />
        ) : (
          <ShowtimesSection
            groupedTheatres={groupedTheatres}
            loading={showsLoading}
          />
        )}
      </section>

      {/* Trailer Modal */}
      {movie.trailerUrl && (
        <TrailerModal
          isOpen={trailerOpen}
          trailerUrl={movie.trailerUrl}
          movieTitle={movie.title}
          onClose={() => setTrailerOpen(false)}
        />
      )}
    </div>
  );
}
