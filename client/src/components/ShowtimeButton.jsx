import React from 'react';
import { formatTime, formatPrice } from '../utils/format.js';

export default function ShowtimeButton({ show, onSelect }) {
  return (
    <button
      onClick={() => onSelect(show._id)}
      className="group flex flex-col items-start px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-rose-500 hover:bg-neutral-800/80 transition-all text-left"
    >
      <div className="flex items-center gap-1.5">
        <span className="text-xs sm:text-sm font-semibold text-neutral-100 group-hover:text-rose-400">
          {formatTime(show.startTime)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[10px] sm:text-xs text-neutral-400 mt-0.5">
        <span className="text-emerald-400 font-medium">{formatPrice(show.price)}</span>
        <span>•</span>
        <span>{show.language || 'Original'}</span>
      </div>
    </button>
  );
}
