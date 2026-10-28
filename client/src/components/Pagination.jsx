import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  page = 1,
  totalPages = 1,
  hasNext = false,
  hasPrev = false,
  onPageChange,
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-6">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={!hasPrev}
        className="p-2 rounded-md bg-[#18181c] border border-[#2a2a30] text-[#92929e] hover:text-[#f4f4f6] hover:bg-[#222227] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <span className="text-xs font-medium text-[#92929e] px-3">
        Page <span className="font-semibold text-[#f4f4f6]">{page}</span> of {totalPages}
      </span>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNext}
        className="p-2 rounded-md bg-[#18181c] border border-[#2a2a30] text-[#92929e] hover:text-[#f4f4f6] hover:bg-[#222227] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
