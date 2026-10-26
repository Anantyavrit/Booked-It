import React from 'react';

export default function MovieCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl bg-neutral-900/40 border border-neutral-800/60 overflow-hidden animate-pulse">
      <div className="aspect-[2/3] w-full bg-neutral-800/60" />
      <div className="p-3.5 space-y-2">
        <div className="h-4 bg-neutral-800 rounded w-3/4" />
        <div className="h-3 bg-neutral-800/70 rounded w-1/2" />
        <div className="pt-2 flex justify-between border-t border-neutral-800/50">
          <div className="h-3 bg-neutral-800 rounded w-1/4" />
          <div className="h-3 bg-neutral-800 rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}
