import React from 'react';

export default function SeatLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 py-2.5 px-4 rounded-lg bg-[#18181c] border border-[#2a2a30] text-xs text-[#92929e]">
      <div className="flex items-center gap-2">
        <div className="w-3.5 h-3.5 rounded bg-[#1e1e24] border border-[#3e3e4a]" />
        <span>Available</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-3.5 h-3.5 rounded bg-[#e50914] border border-[#e50914]" />
        <span className="text-[#f4f4f6] font-medium">Selected</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-3.5 h-3.5 rounded bg-emerald-600 border border-emerald-500" />
        <span className="text-emerald-400 font-medium">Held by You</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-3.5 h-3.5 rounded bg-[#451a03] border border-[#d97706]/60 opacity-60" />
        <span>Held</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-3.5 h-3.5 rounded bg-[#18181c] border border-[#222226] opacity-40" />
        <span>Booked</span>
      </div>
    </div>
  );
}
