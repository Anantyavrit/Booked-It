import React from 'react';
import { formatTime, formatPrice } from '../utils/format.js';

export function getShowAvailability(show) {
  if (show.availability) return show.availability;
  if (show.availableSeats !== undefined && show.totalSeats) {
    const ratio = show.availableSeats / show.totalSeats;
    if (ratio <= 0.2) return 'almost_full';
    if (ratio <= 0.6) return 'filling_fast';
    return 'plenty';
  }
  // Deterministic fallback based on showtime slot
  const d = new Date(show.startTime);
  const hour = d.getHours();
  const hash = (show._id || '')
    .split('')
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);

  if (hour >= 18) {
    return hash % 3 === 0 ? 'almost_full' : 'filling_fast';
  }
  if (hour >= 13) {
    return hash % 2 === 0 ? 'filling_fast' : 'plenty';
  }
  return hash % 4 === 0 ? 'filling_fast' : 'plenty';
}

export default function ShowtimeButton({ show, onSelect }) {
  const availability = getShowAvailability(show);

  const styleMap = {
    plenty: {
      border: 'border-emerald-500/40 hover:border-emerald-500',
      text: 'text-emerald-400',
      bg: 'bg-emerald-950/20 hover:bg-emerald-950/35',
      indicator: 'bg-emerald-500',
    },
    filling_fast: {
      border: 'border-amber-500/40 hover:border-amber-500',
      text: 'text-amber-400',
      bg: 'bg-amber-950/20 hover:bg-amber-950/35',
      indicator: 'bg-amber-500',
    },
    almost_full: {
      border: 'border-rose-500/40 hover:border-rose-500',
      text: 'text-rose-400',
      bg: 'bg-rose-950/20 hover:bg-rose-950/35',
      indicator: 'bg-rose-500',
    },
  };

  const currentStyle = styleMap[availability] || styleMap.plenty;

  return (
    <button
      type="button"
      onClick={() => onSelect(show._id)}
      className={`group flex flex-col items-start px-3 py-2 rounded-md border ${currentStyle.border} ${currentStyle.bg} transition-all text-left cursor-pointer min-w-[100px]`}
      title={`Showtime: ${formatTime(show.startTime)} (${availability.replace('_', ' ')})`}
    >
      <div className="flex items-center gap-1.5 w-full justify-between">
        <span className={`text-xs font-bold ${currentStyle.text}`}>
          {formatTime(show.startTime)}
        </span>
        <span
          className={`w-1.5 h-1.5 rounded-full ${currentStyle.indicator} shrink-0`}
        />
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-[#92929e] mt-1 font-medium">
        <span className="text-[#f4f4f6]">{formatPrice(show.price)}</span>
        <span>•</span>
        <span className="truncate max-w-[65px]">{show.screenName || '2D'}</span>
      </div>
    </button>
  );
}
