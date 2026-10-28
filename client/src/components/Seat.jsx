import React from 'react';

/**
 * Seat Button Component adhering to DESIGN.md design tokens
 * States:
 *   - available: bg-[#1e1e24] border-[#3e3e4a] text-[#d4d4dc] hover:border-[#e50914]
 *   - selected: bg-[#e50914] border-[#e50914] text-white font-bold
 *   - heldByMe: bg-emerald-600 border-emerald-500 text-white font-bold
 *   - heldByOther: bg-[#451a03] border-[#d97706]/60 text-[#fef3c7] disabled
 *   - booked: bg-[#18181c] border-[#222226] text-[#4a4a55] disabled
 */
export default function Seat({ seat, isSelected, isHeldByMe, onToggle, disabled }) {
  const { label, number, status } = seat;

  let btnStyle =
    'bg-[#1e1e24] border-[#3e3e4a] text-[#d4d4dc] hover:border-[#e50914] hover:bg-[#25252e] hover:text-white cursor-pointer';
  let isDisabled = disabled;

  if (status === 'booked') {
    btnStyle =
      'bg-[#18181c] border-[#222226] text-[#4a4a55] cursor-not-allowed opacity-40';
    isDisabled = true;
  } else if (isHeldByMe) {
    btnStyle =
      'bg-emerald-600 border-emerald-500 text-white font-bold shadow-sm';
    isDisabled = disabled;
  } else if (status === 'held') {
    btnStyle =
      'bg-[#451a03] border-[#d97706]/50 text-[#d97706] cursor-not-allowed opacity-60';
    isDisabled = true;
  } else if (isSelected) {
    btnStyle =
      'bg-[#e50914] border-[#e50914] text-white font-bold shadow-sm';
  }

  return (
    <button
      type="button"
      aria-label={`Seat ${label}, ${status}${isSelected ? ', selected' : ''}${
        isHeldByMe ? ', held by you' : ''
      }`}
      disabled={isDisabled}
      onClick={() => onToggle(label)}
      className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded text-[10px] sm:text-[11px] font-medium border flex items-center justify-center transition-colors select-none ${btnStyle}`}
    >
      {number}
    </button>
  );
}
