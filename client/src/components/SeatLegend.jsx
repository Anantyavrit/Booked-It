import React from 'react';

export default function SeatLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 py-3 px-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 text-xs text-neutral-400">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-md bg-neutral-800 border border-neutral-700" />
        <span>Available</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-md bg-rose-600 border border-rose-500 shadow-sm shadow-rose-950" />
        <span className="text-neutral-200">Selected</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-md bg-emerald-600 border border-emerald-500 shadow-sm shadow-emerald-950" />
        <span className="text-emerald-400">Your Hold</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-md bg-amber-950/60 border border-amber-900/60 opacity-60" />
        <span>Held</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-md bg-neutral-950/60 border border-neutral-900 opacity-40" />
        <span>Booked</span>
      </div>
    </div>
  );
}
