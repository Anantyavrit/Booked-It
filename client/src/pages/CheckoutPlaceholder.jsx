import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CreditCard, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function CheckoutPlaceholder() {
  const { bookingId } = useParams();

  useEffect(() => {
    document.title = 'Checkout & Payment — IMovies';
  }, []);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
        <CreditCard className="w-8 h-8" />
      </div>

      <h1 className="text-2xl font-bold text-white tracking-tight">
        Payment coming in the next phase
      </h1>

      <p className="text-xs sm:text-sm text-neutral-400 max-w-md">
        Booking reference secured: <code className="text-emerald-400 bg-neutral-900 px-2.5 py-1 rounded font-mono">{bookingId}</code>.
        The official Razorpay checkout modal with HMAC verification will be wired here in Phase 11!
      </p>

      <div className="flex items-center gap-1.5 text-xs text-neutral-500 pt-2">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>Seats locked for 10 minutes upon order creation</span>
      </div>

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
