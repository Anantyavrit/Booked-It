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
    'The transaction could not be completed or the checkout was dismissed. Your held seats may have expired.';

  return (
    <div className="max-w-md mx-auto py-16 px-4 text-center space-y-6">
      <div className="w-14 h-14 rounded-full bg-[#e50914]/15 border border-[#e50914]/30 mx-auto flex items-center justify-center text-[#e50914]">
        <XCircle className="w-7 h-7" />
      </div>

      <div className="space-y-1.5">
        <h1 className="font-['Outfit'] text-2xl font-bold text-[#f4f4f6] tracking-tight">
          Payment Unsuccessful
        </h1>
        <p className="text-xs sm:text-sm text-[#92929e] leading-relaxed">
          {stateReason || defaultReason}
        </p>
      </div>

      {/* Refund Assurance Banner */}
      <div className="p-4 rounded-lg bg-[#18181c] border border-[#2a2a30] text-left flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-[#92929e]">
          <span className="font-semibold text-[#f4f4f6] block mb-0.5">
            Your Money is Safe
          </span>
          {refundInitiated
            ? 'A full refund has been initiated by Razorpay. Any deducted funds will reflect in your account within 3–5 working days.'
            : 'If any amount was deducted, Razorpay will automatically reverse and refund it to your original payment source.'}
        </div>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
        <Link
          to="/movies"
          className="btn-base w-full sm:w-auto px-5 py-2.5 rounded-md bg-[#e50914] hover:bg-[#c80812] font-semibold text-xs text-white transition-colors gap-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Try Another Show</span>
        </Link>

        <Link
          to="/"
          className="btn-base w-full sm:w-auto px-5 py-2.5 rounded-md bg-[#18181c] hover:bg-[#222227] border border-[#2a2a30] font-semibold text-xs text-[#f4f4f6] transition-colors gap-2"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
      </div>
    </div>
  );
}
