import React from 'react';
import Seat from './Seat.jsx';

export default function SeatGrid({
  seats = [],
  selectedSeats = [],
  heldSeats = [],
  onToggleSeat,
  isHeldMode = false,
}) {
  // Layout metadata is validated server-side; the seat list determines the rendered grid.

  // Group seats by row letter
  const rowsMap = new Map();
  seats.forEach((seat) => {
    if (!rowsMap.has(seat.row)) {
      rowsMap.set(seat.row, []);
    }
    rowsMap.get(seat.row).push(seat);
  });

  // Sort rows A to Z, and seats in row by number 1..N
  const sortedRowLetters = Array.from(rowsMap.keys()).sort();
  sortedRowLetters.forEach((rowLetter) => {
    rowsMap.get(rowLetter).sort((a, b) => a.number - b.number);
  });

  return (
    <div className="w-full space-y-8 select-none">
      {/* Cinema Screen Curve Indicator */}
      <div className="relative flex flex-col items-center justify-center max-w-xl mx-auto px-4">
        <div className="w-full h-2.5 rounded-t-[100px] bg-gradient-to-r from-neutral-800 via-rose-500/80 to-neutral-800 shadow-lg shadow-rose-500/20" />
        <span className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mt-2">
          All eyes this way • Cinema Screen
        </span>
      </div>

      {/* Horizontally scrollable seat matrix */}
      <div className="overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-neutral-800">
        <div className="inline-block min-w-full flex flex-col items-center gap-2.5 px-4">
          {sortedRowLetters.map((rowLetter) => {
            const rowSeats = rowsMap.get(rowLetter) || [];

            return (
              <div key={rowLetter} className="flex items-center gap-3">
                {/* Left Row Label */}
                <span className="w-5 text-center text-xs font-bold text-neutral-500">
                  {rowLetter}
                </span>

                {/* Seats in Row */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {rowSeats.map((seat) => {
                    const isSelected = selectedSeats.includes(seat.label);
                    const isHeldByMe = isHeldMode
                      ? heldSeats.includes(seat.label)
                      : seat.isMine;

                    return (
                      <Seat
                        key={seat.label}
                        seat={seat}
                        isSelected={isSelected}
                        isHeldByMe={isHeldByMe}
                        disabled={isHeldMode}
                        onToggle={onToggleSeat}
                      />
                    );
                  })}
                </div>

                {/* Right Row Label */}
                <span className="w-5 text-center text-xs font-bold text-neutral-500">
                  {rowLetter}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
