import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Armchair, ArrowLeft } from 'lucide-react';

export default function SeatSelectionPlaceholder() {
  const { showId } = useParams();

  useEffect(() => {
    document.title = 'Select Seats — IMovies';
  }, []);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
        <Armchair className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-white tracking-tight">
        Seat selection coming in the next phase
      </h1>
      <p className="text-xs sm:text-sm text-neutral-400 max-w-md">
        You successfully selected show ID <code className="text-rose-400 bg-neutral-900 px-2 py-0.5 rounded font-mono">{showId}</code>.
        The interactive real-time seat grid with Socket.io and Razorpay checkout will be wired here in Phase 10!
      </p>

      <div className="pt-4">
        <Link
          to="/movies"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Movies
        </Link>
      </div>
    </div>
  );
}
