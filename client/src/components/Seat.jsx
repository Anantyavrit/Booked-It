import React from 'react';

/**
 * Seat Button Component
 * States:
 *   - available: neutral-800, hover rose-500
 *   - selected: rose-600 with white text & glow
 *   - heldByMe: emerald-600 with glow
 *   - heldByOther: amber-900/60 disabled
 *   - booked: neutral-950 text-neutral-600 border-neutral-900 disabled
 */
export default function Seat({ seat, isSelected, isHeldByMe, onToggle, disabled }) {
  const { label, number, status } = seat;

  let btnStyle = 'bg-neutral-800/80 border-neutral-700/60 text-neutral-300 hover:border-rose-500 hover:bg-neutral-700 hover:scale-105';
  let isDisabled = disabled;

  if (status === 'booked') {
    btnStyle = 'bg-neutral-950/60 border-neutral-900 text-neutral-600 cursor-not-allowed opacity-40';
    isDisabled = true;
  } else if (isHeldByMe) {
    btnStyle = 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-950/40 font-bold';
    isDisabled = disabled;
  } else if (status === 'held') {
    btnStyle = 'bg-amber-950/40 border-amber-900/60 text-amber-500/50 cursor-not-allowed opacity-60';
    isDisabled = true;
  } else if (isSelected) {
    btnStyle = 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-950/50 font-bold scale-105';
  }

  return (
    <button
      type="button"
      aria-label={`Seat ${label}, ${status}${isSelected ? ', selected' : ''}${isHeldByMe ? ', held by you' : ''}`}
      disabled={isDisabled}
      onClick={() => onToggle(label)}
      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border text-[11px] sm:text-xs flex items-center justify-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-rose-500 select-none ${btnStyle}`}
    >
      {number}
    </button>
  );
}
