import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Film,
  Clock,
  Calendar,
  Globe,
  Play,
  Users,
  ArrowLeft,
  Star,
  UserCheck,
} from 'lucide-react';
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
      document.title = `${movie.title} — Showtimes & Booking | IMovies`;
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
      <div className="space-y-8 py-6 animate-pulse">
        <div className="h-5 w-32 bg-[#18181c] rounded" />
        <div className="h-96 w-full bg-[#18181c] border border-[#2a2a30] rounded-xl" />
        <div className="h-64 bg-[#18181c] border border-[#2a2a30] rounded-xl w-full" />
      </div>
    );
  }

  if (movieError || !movie) {
    return (
      <div className="py-12">
        <ErrorState
          title="Movie Not Found"
          message={
            movieError ||
            'The movie you are looking for does not exist or is currently unavailable.'
          }
          onRetry={refetchMovie}
        />
        <div className="text-center mt-6">
          <Link
            to="/movies"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#e50914] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to explore movies
          </Link>
        </div>
      </div>
    );
  }

  const releaseYear = movie.releaseDate
    ? new Date(movie.releaseDate).getFullYear()
    : null;

  return (
    <div className="space-y-8 py-4 sm:py-6">
      {/* Back navigation */}
      <div>
        <Link
          to="/movies"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#92929e] hover:text-[#f4f4f6] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to movies</span>
        </Link>
      </div>

      {/* Backdrop Header with Poster & Metadata */}
      <section className="relative rounded-xl overflow-hidden bg-[#18181c] border border-[#2a2a30]">
        {/* Backdrop Artwork Background (Wide Cinema Vignette) */}
        {movie.backdrop && (
          <div className="absolute inset-0 pointer-events-none">
            <img
              src={movie.backdrop}
              alt=""
              className="w-full h-full object-cover object-top opacity-20 filter"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#18181c] via-[#18181c]/90 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#18181c] via-[#18181c]/80 to-transparent" />
          </div>
        )}

        <div className="relative z-10 p-5 sm:p-8 md:p-10 flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          {/* Poster (2:3 aspect ratio) */}
          <div className="w-44 sm:w-56 md:w-64 aspect-[2/3] shrink-0 rounded-lg overflow-hidden border border-[#2a2a30] bg-[#0f0f11] shadow-2xl relative">
            {!imgError && movie.poster ? (
              <img
                src={movie.poster}
                alt={movie.title}
                loading="lazy"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-[#0f0f11] text-[#92929e]">
                <Film className="w-10 h-10 mb-2 opacity-50 text-[#e50914]" />
                <span className="text-xs font-semibold text-[#f4f4f6]">
                  {movie.title}
                </span>
              </div>
            )}

            {/* Poster Format Badges */}
            {movie.formats && movie.formats.length > 0 && (
              <div className="absolute bottom-2 left-2 flex items-center gap-1">
                {movie.formats.map((fmt) => (
                  <span
                    key={fmt}
                    className="px-1.5 py-0.5 rounded bg-black/80 border border-white/10 text-[10px] font-semibold text-white"
                  >
                    {fmt}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Details Column */}
          <div className="flex-1 space-y-4">
            {/* Category / Certificate / Genres Row */}
            <div className="flex flex-wrap items-center gap-2">
              {movie.certificate && (
                <span className="px-2 py-0.5 rounded bg-[#0f0f11] border border-[#2a2a30] font-mono text-[11px] font-semibold text-[#f4f4f6]">
                  {movie.certificate}
                </span>
              )}

              {movie.status === 'now_showing' ? (
                <span className="px-2 py-0.5 rounded bg-[#e50914]/15 border border-[#e50914]/40 text-[11px] font-semibold text-white">
                  Now Showing
                </span>
              ) : movie.status === 'coming_soon' ? (
                <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-[11px] font-semibold text-amber-400">
                  Coming Soon
                </span>
              ) : null}

              {movie.genres?.map((genre) => (
                <span
                  key={genre}
                  className="px-2 py-0.5 rounded bg-[#0f0f11] border border-[#2a2a30] text-[11px] font-medium text-[#92929e]"
                >
                  {genre}
                </span>
              ))}
            </div>

            {/* Movie Title */}
            <h1 className="font-['Outfit'] text-2xl sm:text-4xl md:text-5xl font-extrabold text-[#f4f4f6] tracking-tight leading-tight">
              {movie.title}
            </h1>

            {/* Tagline */}
            {movie.tagline && (
              <p className="text-xs sm:text-sm text-[#92929e] italic font-medium">
                "{movie.tagline}"
              </p>
            )}

            {/* Specs & Rating Row */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#92929e] pt-1">
              {movie.rating ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0f0f11] border border-[#2a2a30]">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-[#f4f4f6]">
                    {Number(movie.rating).toFixed(1)}
                  </span>
                  <span className="text-[10px] text-[#92929e]">/ 10</span>
                </div>
              ) : null}

              <span className="flex items-center gap-1 text-[#f4f4f6]">
                <Clock className="w-3.5 h-3.5 text-[#92929e]" />
                {formatDuration(movie.duration)}
              </span>

              <span>•</span>

              <span className="flex items-center gap-1 text-[#f4f4f6]">
                <Globe className="w-3.5 h-3.5 text-[#92929e]" />
                {movie.languages?.join(', ') || movie.language}
              </span>

              {movie.releaseDate && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#92929e]" />
                    {formatDate(movie.releaseDate, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </>
              )}
            </div>

            {/* Synopsis */}
            {movie.description && (
              <div className="pt-1">
                <h2 className="text-xs uppercase tracking-wider font-semibold text-[#92929e] mb-1">
                  Synopsis
                </h2>
                <p className="text-xs sm:text-sm text-[#f4f4f6]/90 leading-relaxed max-w-3xl">
                  {movie.description}
                </p>
              </div>
            )}

            {/* Director & Cast */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              {movie.director && (
                <div>
                  <span className="text-[#92929e] block font-medium">Director</span>
                  <span className="font-semibold text-[#f4f4f6]">
                    {movie.director}
                  </span>
                </div>
              )}

              {movie.cast && movie.cast.length > 0 && (
                <div>
                  <span className="text-[#92929e] block font-medium">Starring Cast</span>
                  <span className="text-[#f4f4f6] line-clamp-2">
                    {movie.cast.join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Trailer Action Button */}
            {movie.trailerUrl && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setTrailerOpen(true)}
                  className="btn-base px-4 py-2 rounded-md bg-[#0f0f11] hover:bg-[#222227] border border-[#2a2a30] hover:border-[#3e3e4a] text-xs font-semibold text-[#f4f4f6] transition-colors cursor-pointer gap-2"
                >
                  <Play className="w-3.5 h-3.5 text-[#e50914] fill-[#e50914]" />
                  <span>Watch Trailer</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Showtimes Section (Grouped by Theatre + Date Tabs + Availability Pills) */}
      <section className="pt-2">
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
