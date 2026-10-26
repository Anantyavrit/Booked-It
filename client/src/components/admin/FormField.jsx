import React from 'react';

export default function FormField({ label, error, required, children, hint }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-neutral-300 uppercase tracking-wider">
          {label}{required && <span className="text-rose-400 ml-1">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-neutral-500">{hint}</p>}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}

export function inputCls(error) {
  return `w-full px-3 py-2 rounded-lg bg-neutral-800 border ${error ? 'border-rose-500' : 'border-neutral-700'} text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500/60 transition-colors`;
}

export function selectCls(error) {
  return `w-full px-3 py-2 rounded-lg bg-neutral-800 border ${error ? 'border-rose-500' : 'border-neutral-700'} text-sm text-neutral-100 focus:outline-none focus:border-amber-500/60 transition-colors`;
}
