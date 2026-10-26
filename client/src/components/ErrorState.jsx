import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function ErrorState({
  title = 'Something went wrong',
  message = 'Failed to load content. Please try again.',
  onRetry,
}) {
  return (
    <div className="py-16 px-4 text-center flex flex-col items-center justify-center rounded-2xl border border-rose-900/30 bg-rose-950/10">
      <div className="w-12 h-12 rounded-full bg-rose-950/60 flex items-center justify-center text-rose-400 mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-neutral-200">{title}</h3>
      <p className="text-xs sm:text-sm text-neutral-400 max-w-sm mt-1 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs sm:text-sm font-medium text-white transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Retry
        </button>
      )}
    </div>
  );
}
