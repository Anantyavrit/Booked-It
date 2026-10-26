import React, { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { XCircle, RotateCcw, Home, ShieldAlert } from 'lucide-react';

export default function PaymentFailedPage() {
  const location = useLocation();

  useEffect(() => {
    document.title = 'Payment Status — IMovies';
  }, []);

  const stateReason = location.state?.reason;
  const refundInitiated = location.state?.refundInitiated;

  const defaultReason =
    'The transaction could not be completed or the payment was cancelled. Your selected seats may have been released.';

  return (
    <div className="max-w-md mx-auto py-16 px-4 text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 mx-auto flex items-center justify-center text-rose-500 shadow-lg shadow-rose-950/40">
        <XCircle className="w-10 h-10" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Payment Unsuccessful</h1>
        <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
          {stateReason || defaultReason}
        </p>
      </div>

      {/* Refund Assurance Banner */}
      <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-left flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-neutral-300">
          <span className="font-semibold text-white block mb-0.5">Your Money is Safe</span>
          {refundInitiated
            ? 'A full refund has already been triggered by Razorpay. Any deducted amount will reflect in your original payment method in 3–5 working days.'
            : 'If any amount was deducted from your account, Razorpay will automatically reverse and refund it to your original payment method.'}
        </div>
      </div>

      <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          to="/movies"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 font-semibold text-xs text-white transition-all shadow-lg shadow-rose-950/30"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Try Another Show</span>
        </Link>

        <Link
          to="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 font-semibold text-xs text-neutral-300 hover:text-white transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </Link>
      </div>
    </div>
  );
}
