import React from 'react';
import { Film } from 'lucide-react';

export default function EmptyState({
  title = 'No movies found',
  description = 'Try adjusting your search or filters to discover movies.',
  action,
}) {
  return (
    <div className="py-16 px-4 text-center flex flex-col items-center justify-center rounded-lg border border-[#2a2a30] bg-[#18181c]">
      <div className="w-12 h-12 rounded-full bg-[#0f0f11] border border-[#2a2a30] flex items-center justify-center text-[#92929e] mb-3">
        <Film className="w-5 h-5 text-[#e50914]" />
      </div>
      <h3 className="font-['Outfit'] text-base font-semibold text-[#f4f4f6]">{title}</h3>
      <p className="text-xs sm:text-sm text-[#92929e] max-w-sm mt-1">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
