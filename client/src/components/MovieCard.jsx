import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Film, Clock } from 'lucide-react';
import { formatDuration } from '../utils/format.js';

export default function MovieCard({ movie }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      to={`/movies/${movie._id}`}
      className="group relative flex flex-col rounded-2xl bg-neutral-900/70 border border-neutral-800/80 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:border-rose-500/50 hover:shadow-xl hover:shadow-rose-950/20"
    >
      {/* Poster with fallback */}
      <div className="relative aspect-[2/3] w-full bg-neutral-900 overflow-hidden flex items-center justify-center">
        {!imgError && movie.poster ? (
          <img
            src={movie.poster}
            alt={movie.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center bg-gradient-to-b from-neutral-800 to-neutral-950 text-neutral-400">
            <Film className="w-10 h-10 mb-2 text-rose-500/60" />
            <span className="text-sm font-semibold text-neutral-200 line-clamp-2">{movie.title}</span>
          </div>
        )}

        {/* Certificate Badge */}
        {movie.certificate && (
          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-neutral-950/80 backdrop-blur-md border border-neutral-700/60 text-xs font-semibold text-neutral-200 tracking-wider">
            {movie.certificate}
          </span>
        )}

        {/* Hover overlay hint */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
          <span className="text-xs font-semibold text-rose-400">Book Showtimes &rarr;</span>
        </div>
      </div>

      {/* Info Container */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
        <div>
          <h3 className="font-semibold text-sm sm:text-base text-neutral-100 line-clamp-1 group-hover:text-rose-400 transition-colors">
            {movie.title}
          </h3>
          <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">
            {movie.genres?.join(' • ') || 'Feature Film'}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-neutral-500 pt-1 border-t border-neutral-800/60">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            {formatDuration(movie.duration)}
          </span>
          <span className="truncate max-w-[100px] text-right">
            {movie.languages?.[0] || ''}
          </span>
        </div>
      </div>
    </Link>
  );
}
