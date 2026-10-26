import React from 'react';

const BADGE_MAP = {
  confirmed:      'bg-emerald-900/50 text-emerald-300 border-emerald-800',
  cancelled:      'bg-rose-900/50 text-rose-300 border-rose-800',
  pending:        'bg-amber-900/50 text-amber-300 border-amber-800',
  expired:        'bg-neutral-800 text-neutral-400 border-neutral-700',
  active:         'bg-emerald-900/50 text-emerald-300 border-emerald-800',
  inactive:       'bg-neutral-800 text-neutral-400 border-neutral-700',
  upcoming:       'bg-sky-900/50 text-sky-300 border-sky-800',
  past:           'bg-neutral-800 text-neutral-400 border-neutral-700',
  paid:           'bg-emerald-900/50 text-emerald-300 border-emerald-800',
  failed:         'bg-rose-900/50 text-rose-300 border-rose-800',
  refunded:       'bg-violet-900/50 text-violet-300 border-violet-800',
  refund_pending: 'bg-amber-900/50 text-amber-300 border-amber-800',
  created:        'bg-neutral-800 text-neutral-400 border-neutral-700',
};

export default function StatusBadge({ status, label }) {
  const cls = BADGE_MAP[status] || 'bg-neutral-800 text-neutral-400 border-neutral-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label || status}
    </span>
  );
}
