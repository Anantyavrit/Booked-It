import React from 'react';
import { formatDate } from '../utils/format.js';

export default function DateTabs({ dates = [], selectedDate, onSelectDate }) {
  if (dates.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
      {dates.map((dateStr) => {
        const isSelected = selectedDate === dateStr;
        const [weekday, day, month] = formatDate(dateStr, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }).split(' ');

        return (
          <button
            key={dateStr}
            onClick={() => onSelectDate(dateStr)}
            className={`flex flex-col items-center justify-center min-w-[70px] py-2 px-3 rounded-xl border text-xs transition-all ${
              isSelected
                ? 'bg-rose-600 border-rose-500 text-white font-semibold shadow-lg shadow-rose-950/40'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
            }`}
          >
            <span className="uppercase text-[10px] tracking-wider font-medium">{weekday}</span>
            <span className="text-sm sm:text-base font-bold my-0.5">{day}</span>
            <span className="text-[10px]">{month}</span>
          </button>
        );
      })}
    </div>
  );
}
