import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Copy, Check, Printer, Home, AlertCircle } from 'lucide-react';
import { bookingApi } from '../api/bookingApi.js';
import { formatPrice, formatDate, formatTime } from '../utils/format.js';
import ErrorState from '../components/ErrorState.jsx';
import { toast } from 'react-toastify';

export default function BookingConfirmationPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isStillProcessing, setIsStillProcessing] = useState(false);

  const pollIntervalRef = useRef(null);
  const pollTimeoutRef = useRef(null);

  const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id || '');

  useEffect(() => {
    document.title = 'Booking Confirmed — IMovies';
  }, []);

  useEffect(() => {
    if (!isValidObjectId) return;

    let isMounted = true;
    let pollCount = 0;
    const maxPolls = 10; // 3s * 10 = 30s

    const checkStatus = async () => {
      try {
        const res = await bookingApi.getBooking(id);
        const b = res?.data;

        if (!isMounted) return;

        if (b.status === 'confirmed') {
          setBooking(b);
          setLoading(false);
          clearInterval(pollIntervalRef.current);
          clearTimeout(pollTimeoutRef.current);
        } else if (b.status === 'expired' || b.status === 'cancelled') {
          setError(`This booking is ${b.status}.`);
          setLoading(false);
          clearInterval(pollIntervalRef.current);
          clearTimeout(pollTimeoutRef.current);
        } else {
          // Still pending
          pollCount++;
          if (pollCount >= maxPolls) {
            setIsStillProcessing(true);
            setLoading(false);
            clearInterval(pollIntervalRef.current);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || err.message);
          setLoading(false);
          clearInterval(pollIntervalRef.current);
        }
      }
    };

    checkStatus();
    pollIntervalRef.current = setInterval(checkStatus, 3000);

    return () => {
      isMounted = false;
      clearInterval(pollIntervalRef.current);
      clearTimeout(pollTimeoutRef.current);
    };
  }, [id, isValidObjectId]);

  const handleCopyCode = () => {
    if (booking?.bookingCode) {
      navigator.clipboard.writeText(booking.bookingCode);
      setCopied(true);
      toast.success('Booking code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isValidObjectId) {
    return (
      <div className="py-16">
        <ErrorState title="Invalid ID" message="The booking reference ID format is invalid." />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-rose-500/30 border-t-rose-500 animate-spin mx-auto" />
        <h2 className="text-xl font-bold text-white">Confirming your booking...</h2>
        <p className="text-xs text-neutral-400">Verifying transaction and assigning cinema ticket seats.</p>
      </div>
    );
  }

  if (isStillProcessing) {
    return (
      <div className="py-16 max-w-lg mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mx-auto flex items-center justify-center text-amber-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white">Payment Still Processing</h2>
        <p className="text-xs sm:text-sm text-neutral-400">
          Your payment transaction is taking slightly longer to confirm. You will receive an in-app notification once the cinema records the confirmation.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            to="/movies"
            className="px-5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-semibold text-white"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="py-16">
        <ErrorState title="Confirmation Unavailable" message={error || 'Booking record could not be loaded.'} />
        <div className="text-center mt-6">
          <Link to="/movies" className="text-xs text-rose-400 hover:text-rose-300">
            &larr; Back to movies
          </Link>
        </div>
      </div>
    );
  }

  const show = booking.show;
  const movie = show?.movie;
  const theatre = show?.theatre;

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8 print:py-0 print:m-0 print:max-w-none">
      {/* Printable E-Ticket Container */}
      <div className="p-6 sm:p-10 rounded-3xl bg-neutral-900/60 border border-neutral-800 backdrop-blur-md space-y-8 relative overflow-hidden print:border-none print:bg-white print:text-black">
        {/* Animated Check Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 mx-auto flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-950/40 print:hidden">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 print:text-emerald-700">
            Booking Confirmed
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white print:text-black">
            You're Going to the Movies!
          </h1>
          <p className="text-xs text-neutral-400 print:text-neutral-600">
            Please show this digital ticket receipt at the cinema entrance counter.
          </p>
        </div>

        {/* Big Booking Code Display */}
        <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-center space-y-2 print:bg-neutral-100 print:border-neutral-300">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 print:text-neutral-600">
            Cinema Entry Booking Code
          </span>
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl sm:text-3xl font-mono font-extrabold text-amber-400 tracking-wider print:text-neutral-900">
              {booking.bookingCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors print:hidden"
              title="Copy Booking Code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Ticket Details Grid */}
        <div className="space-y-4 text-xs pt-2 border-t border-neutral-800/80 print:border-neutral-300">
          <div className="flex justify-between items-start gap-4">
            <div>
              <span className="text-neutral-400 print:text-neutral-600">Movie Title</span>
              <h3 className="text-sm font-bold text-white print:text-black mt-0.5">{movie?.title}</h3>
            </div>
            <div className="text-right">
              <span className="text-neutral-400 print:text-neutral-600">Screen</span>
              <div className="text-sm font-bold text-white print:text-black mt-0.5">{show?.screenName}</div>
            </div>
          </div>

          <div className="flex justify-between items-start gap-4">
            <div>
              <span className="text-neutral-400 print:text-neutral-600">Cinema & Location</span>
              <p className="text-neutral-200 print:text-neutral-800 font-medium mt-0.5">
                {theatre?.name}, {theatre?.address}, {theatre?.city}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-start gap-4">
            <div>
              <span className="text-neutral-400 print:text-neutral-600">Show Date & Time</span>
              <p className="text-neutral-200 print:text-neutral-800 font-medium mt-0.5">
                {formatDate(show?.startTime)} at {formatTime(show?.startTime)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-neutral-400 print:text-neutral-600">Language</span>
              <p className="text-neutral-200 print:text-neutral-800 font-medium mt-0.5">{show?.language}</p>
            </div>
          </div>

          {/* Reserved Seats List */}
          <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 print:bg-neutral-50 print:border-neutral-200">
            <span className="text-[11px] font-semibold text-neutral-400 print:text-neutral-600 block mb-1.5">
              Confirmed Seats ({booking.seats.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {booking.seats.map((seatLabel) => (
                <span
                  key={seatLabel}
                  className="px-2.5 py-1 rounded-md bg-rose-950/60 border border-rose-900/60 text-xs font-bold text-rose-300 print:bg-neutral-200 print:text-neutral-900 print:border-neutral-300"
                >
                  {seatLabel}
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-neutral-800 print:border-neutral-300">
            <span className="text-neutral-300 print:text-neutral-700">Total Paid (Razorpay Verified)</span>
            <span className="text-emerald-400 print:text-neutral-900 text-base">{formatPrice(booking.amount)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 font-semibold text-xs text-white transition-colors"
          >
            <Printer className="w-4 h-4 text-neutral-300" />
            <span>Print Ticket</span>
          </button>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 font-semibold text-xs text-white shadow-lg shadow-rose-950/30 transition-all"
            >
              <Home className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
