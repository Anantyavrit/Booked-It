import React, { useMemo } from 'react';
import Seat from './Seat.jsx';
import { formatPrice } from '../utils/format.js';

export default function SeatGrid({
  seats = [],
  selectedSeats = [],
  heldSeats = [],
  price = 250,
  onToggleSeat,
  isHeldMode = false,
}) {
  // Group seats by row letter
  const rowsMap = useMemo(() => {
    const map = new Map();
    seats.forEach((seat) => {
      if (!map.has(seat.row)) {
        map.set(seat.row, []);
      }
      map.get(seat.row).push(seat);
    });

    // Sort row seats by number ascending
    map.forEach((rowSeats) => {
      rowSeats.sort((a, b) => a.number - b.number);
    });

    return map;
  }, [seats]);

  // Sort rows in reverse or A-Z order (rear rows at top, screen at bottom or screen at top)
  // Standard in Indian cinema ticketing: Screen is at the bottom, or at the top with A at top.
  // We keep sortedRowLetters A..Z.
  const sortedRowLetters = useMemo(() => {
    return Array.from(rowsMap.keys()).sort();
  }, [rowsMap]);

  // Group rows into 3 realistic price-tier zones
  const tieredSections = useMemo(() => {
    const totalRows = sortedRowLetters.length;
    if (totalRows === 0) return [];

    const premiumCutoff = Math.max(1, Math.floor(totalRows * 0.25));
    const executiveCutoff = Math.max(premiumCutoff + 1, Math.floor(totalRows * 0.7));

    const premiumRows = sortedRowLetters.slice(0, premiumCutoff);
    const executiveRows = sortedRowLetters.slice(premiumCutoff, executiveCutoff);
    const standardRows = sortedRowLetters.slice(executiveCutoff);

    const sections = [];
    if (premiumRows.length > 0) {
      sections.push({
        title: 'PREMIUM RECLINER',
        price: Math.round(price * 1.25),
        rows: premiumRows,
      });
    }
    if (executiveRows.length > 0) {
      sections.push({
        title: 'EXECUTIVE',
        price: price,
        rows: executiveRows,
      });
    }
    if (standardRows.length > 0) {
      sections.push({
        title: 'STANDARD',
        price: Math.round(price * 0.85),
        rows: standardRows,
      });
    }

    return sections;
  }, [sortedRowLetters, price]);

  return (
    <div className="w-full space-y-6 select-none">
      {/* 1. Curved & Centered "SCREEN" Indicator */}
      <div className="relative flex flex-col items-center justify-center max-w-sm sm:max-w-md mx-auto px-4 pt-2">
        <div className="w-full h-3 border-t-2 border-[#e50914] rounded-t-[100%] opacity-90 shadow-[0_-3px_12px_rgba(229,9,20,0.25)]" />
        <span className="text-[10px] font-semibold tracking-widest uppercase text-[#92929e] mt-1.5">
          SCREEN THIS WAY
        </span>
      </div>

      {/* 2. Horizontally scrollable seat matrix (responsive down to 375px) */}
      <div className="overflow-x-auto no-scrollbar py-4 px-2">
        <div className="inline-block min-w-full flex flex-col items-center gap-6">
          {tieredSections.map((section) => (
            <div key={section.title} className="w-full space-y-3 flex flex-col items-center">
              {/* Price Tier Header */}
              <div className="w-full max-w-lg border-b border-[#2a2a30] pb-1 flex items-center justify-between text-[11px] text-[#92929e] px-4 font-semibold uppercase tracking-wider">
                <span>{section.title}</span>
                <span className="text-[#f4f4f6] font-bold">
                  {formatPrice(section.price)}
                </span>
              </div>

              {/* Rows in this tier */}
              <div className="space-y-2 flex flex-col items-center">
                {section.rows.map((rowLetter) => {
                  const rowSeats = rowsMap.get(rowLetter) || [];
                  const midIndex = Math.floor(rowSeats.length / 2) - 1;

                  return (
                    <div
                      key={rowLetter}
                      className="flex items-center gap-2 sm:gap-3"
                    >
                      {/* Left Row Label */}
                      <span className="w-4 sm:w-5 text-center text-xs font-bold text-[#92929e] shrink-0">
                        {rowLetter}
                      </span>

                      {/* Seats in Row with Middle Aisle Gap */}
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        {rowSeats.map((seat, idx) => {
                          const isSelected = selectedSeats.includes(seat.label);
                          const isHeldByMe = isHeldMode
                            ? heldSeats.includes(seat.label)
                            : seat.isMine;
                          const hasAisleGap = idx === midIndex && rowSeats.length > 5;

                          return (
                            <React.Fragment key={seat.label}>
                              <Seat
                                seat={seat}
                                isSelected={isSelected}
                                isHeldByMe={isHeldByMe}
                                disabled={isHeldMode}
                                onToggle={onToggleSeat}
                              />
                              {hasAisleGap && (
                                <div
                                  className="w-4 sm:w-6 md:w-8 shrink-0"
                                  aria-hidden="true"
                                />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>

                      {/* Right Row Label */}
                      <span className="w-4 sm:w-5 text-center text-xs font-bold text-[#92929e] shrink-0">
                        {rowLetter}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
