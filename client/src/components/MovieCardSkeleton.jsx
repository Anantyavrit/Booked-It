import React from 'react';

export default function MovieCardSkeleton() {
  return (
    <div className="w-full animate-pulse">
      <div className="aspect-[2/3] w-full rounded-md bg-[#18181c] border border-[#2a2a30]/50" />
      <div className="mt-2 space-y-1.5">
        <div className="h-4 bg-[#222227] rounded w-3/4" />
        <div className="h-3 bg-[#18181c] rounded w-1/2" />
        <div className="h-2.5 bg-[#18181c] rounded w-1/3" />
      </div>
    </div>
  );
}
