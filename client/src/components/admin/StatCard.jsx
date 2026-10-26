import React from 'react';

export default function StatCard({ label, value, sub, icon: Icon, loading }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-neutral-600" />}
      </div>
      {loading ? (
        <div className="h-8 w-24 bg-neutral-800 rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-white">{value}</p>
      )}
      {sub && !loading && <p className="text-xs text-neutral-500">{sub}</p>}
    </div>
  );
}
