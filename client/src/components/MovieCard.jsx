import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Film, Star } from 'lucide-react';
import { formatDuration, formatDate } from '../utils/format.js';

export default function MovieCard({ movie }) {
  const [imgError, setImgError] = useState(false);

  const isComingSoon = movie.status === 'coming_soon';
  const displayRating = movie.rating ? Number(movie.rating).toFixed(1) : null;

  return (
    <Link
      to={`/movies/${movie._id}`}
      className="group block w-full focus:outline-none"
    >
      {/* 2:3 Aspect Ratio Clean Poster Container (No card borders or heavy outer shadows) */}
      <div className="relative aspect-[2/3] w-full rounded-md overflow-hidden bg-[#18181c] border border-[#2a2a30]/60">
        {!imgError && movie.poster ? (
          <img
            src={movie.poster}
            alt={movie.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center bg-[#18181c] text-[#92929e]">
            <Film className="w-8 h-8 mb-2 text-[#92929e]/50" />
            <span className="text-xs font-medium text-[#f4f4f6] line-clamp-2">
              {movie.title}
            </span>
          </div>
        )}

        {/* Top-Left Rating or Status Pill */}
        {displayRating ? (
          <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/80 text-amber-400 text-[11px] font-bold border border-black/40">
            <Star className="w-3 h-3 fill-amber-400 stroke-none" />
            <span>{displayRating}</span>
          </div>
        ) : isComingSoon ? (
          <div className="absolute top-2 left-2 inline-flex items-center px-1.5 py-0.5 rounded bg-[#e50914] text-white text-[10px] font-bold uppercase tracking-wider">
            Upcoming
          </div>
        ) : null}

        {/* Certificate Badge */}
        {movie.certificate && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono font-semibold text-[#f4f4f6] border border-white/10">
            {movie.certificate}
          </div>
        )}

        {/* Formats Pill on Bottom-Left */}
        {movie.formats && movie.formats.length > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-semibold text-[#f4f4f6] border border-white/10">
              {movie.formats[0]}
            </span>
          </div>
        )}
      </div>

      {/* Title & Metadata cleanly stacked under the poster */}
      <div className="mt-2 space-y-0.5">
        <h3 className="font-['Outfit'] font-semibold text-sm text-[#f4f4f6] truncate group-hover:text-white transition-colors">
          {movie.title}
        </h3>

        <p className="text-xs text-[#92929e] truncate">
          {movie.genres?.slice(0, 2).join(' • ') || movie.language || 'Cinema'}
        </p>

        {isComingSoon && movie.releaseDate ? (
          <p className="text-[11px] font-medium text-amber-400/90 truncate">
            {formatDate(movie.releaseDate, { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        ) : (
          <p className="text-[11px] text-[#92929e] truncate">
            {movie.language} {movie.duration ? `• ${formatDuration(movie.duration)}` : ''}
          </p>
        )}
      </div>
    </Link>
  );
}
