import React from 'react';
import { WifiOff } from 'lucide-react';

export default function ConnectionBadge({ connected }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
        connected
          ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-400'
          : 'bg-amber-950/40 border-amber-900/60 text-amber-400 animate-pulse'
      }`}
    >
      {connected ? (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>Live Seats</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Reconnecting...</span>
        </>
      )}
    </div>
  );
}
