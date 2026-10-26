import React from 'react';
import { Film } from 'lucide-react';

export default function EmptyState({
  title = 'No movies found',
  description = 'Try adjusting your search or filters to discover movies.',
  action,
}) {
  return (
    <div className="py-16 px-4 text-center flex flex-col items-center justify-center rounded-2xl border border-neutral-900 bg-neutral-900/30">
      <div className="w-12 h-12 rounded-full bg-neutral-800/80 flex items-center justify-center text-neutral-400 mb-3">
        <Film className="w-6 h-6 text-rose-500" />
      </div>
      <h3 className="text-base font-semibold text-neutral-200">{title}</h3>
      <p className="text-xs sm:text-sm text-neutral-400 max-w-sm mt-1">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
