import React from 'react';
import { formatDate } from '../utils/format.js';

export default function DateTabs({ dates = [], selectedDate, onSelectDate }) {
  if (dates.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
      {dates.map((dateStr) => {
        const isSelected = selectedDate === dateStr;
        const formatted = formatDate(dateStr, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });
        const [weekday, day, month] = formatted.split(' ');

        return (
          <button
            key={dateStr}
            type="button"
            onClick={() => onSelectDate(dateStr)}
            className={`flex flex-col items-center justify-center min-w-[64px] py-2 px-2.5 rounded-md border text-xs transition-colors shrink-0 cursor-pointer ${
              isSelected
                ? 'bg-[#e50914] border-[#e50914] text-white font-semibold shadow-sm'
                : 'bg-[#18181c] border-[#2a2a30] text-[#92929e] hover:text-[#f4f4f6] hover:bg-[#222227] hover:border-[#3e3e4a]'
            }`}
          >
            <span className="uppercase text-[10px] tracking-wider font-semibold opacity-90">
              {weekday}
            </span>
            <span className="font-['Outfit'] text-base font-bold my-0.5 leading-tight">
              {day}
            </span>
            <span className="text-[10px] uppercase font-medium opacity-80">
              {month}
            </span>
          </button>
        );
      })}
    </div>
  );
}
