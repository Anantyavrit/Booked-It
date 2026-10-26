import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';
import { useCountdown } from '../hooks/useCountdown.js';

export default function HoldTimer({ expiresAt, serverOffsetMs, onExpire }) {
  const { secondsLeft, formatted, isExpiringSoon } = useCountdown(expiresAt, serverOffsetMs, onExpire);
  const [announcement, setAnnouncement] = useState('');

  // Announce only at milestones (60s, 30s, 10s) instead of every second to avoid screen reader spam
  useEffect(() => {
    if (secondsLeft === 60) {
      setAnnouncement('Notice: Seat hold expires in 1 minute.');
    } else if (secondsLeft === 30) {
      setAnnouncement('Warning: Seat hold expires in 30 seconds.');
    } else if (secondsLeft === 10) {
      setAnnouncement('Urgent: Seat hold expires in 10 seconds.');
    }
  }, [secondsLeft]);

  return (
    <>
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold tracking-wider transition-colors ${
          isExpiringSoon
            ? 'bg-rose-950/80 border-rose-500 text-rose-400 animate-pulse'
            : 'bg-emerald-950/60 border-emerald-500/80 text-emerald-400'
        }`}
        aria-label={`Seat hold timer: ${formatted} remaining`}
      >
        <Timer className="w-3.5 h-3.5" aria-hidden="true" />
        <span aria-hidden="true">{formatted}</span>
      </div>

      {/* Screen-reader aria-live announcement region */}
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
    </>
  );
}
