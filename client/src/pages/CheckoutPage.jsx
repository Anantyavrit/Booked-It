import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  CreditCard,
  ShieldCheck,
  ArrowLeft,
  XCircle,
  AlertCircle,
  Film,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { bookingApi } from '../api/bookingApi.js';
import { paymentApi } from '../api/paymentApi.js';
import { loadRazorpay } from '../utils/loadRazorpay.js';
import { formatPrice, formatDate, formatTime } from '../utils/format.js';
import HoldTimer from '../components/HoldTimer.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { toast } from 'react-toastify';

export default function CheckoutPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [serverOffsetMs] = useState(0);

  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [confirmingModal, setConfirmingModal] = useState(false);
  const [verifyRetryState, setVerifyRetryState] = useState(null); // stores payload for retry if 3 attempts fail
  const [holdExpired, setHoldExpired] = useState(false);

  const isPayingRef = useRef(false);
  isPayingRef.current = paymentInProgress || confirmingModal;

  // Validate ObjectId format
  const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(bookingId || '');

  // 1. Fetch Booking Details
  const fetchBooking = useCallback(async () => {
    if (!isValidObjectId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await bookingApi.getBooking(bookingId);
      const b = res?.data;

      if (!b) {
        setError('Booking not found');
        return;
      }

      // Check statuses
      if (b.status === 'confirmed') {
        navigate(`/booking/${b._id}/confirmation`, { replace: true });
        return;
      }

      if (b.status === 'cancelled') {
        setError('This booking was cancelled.');
        return;
      }

      if (b.status === 'expired') {
        setHoldExpired(true);
        return;
      }

      // Check if hold is already past
      if (new Date(b.holdExpiresAt) <= new Date()) {
        setHoldExpired(true);
        return;
      }

      setBooking(b);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Not authorised to access this booking');
      } else if (err.response?.status === 404) {
        setError('Booking not found');
      } else {
        setError(err.response?.data?.message || err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [bookingId, isValidObjectId, navigate]);

  useEffect(() => {
    document.title = 'Checkout & Payment — IMovies';
    if (isValidObjectId) {
      fetchBooking();
    }
  }, [isValidObjectId, fetchBooking]);

  // Beforeunload warning while payment is in progress
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isPayingRef.current) {
        e.preventDefault();
        e.returnValue = 'Payment is in progress. Closing this page may cause transaction failure.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Timer Expiration Callback
  const handleTimerExpire = useCallback(() => {
    setHoldExpired(true);
    toast.warn('Your seat hold has expired. Please reselect your seats.');
  }, []);

  // Verification retry logic (up to 3 attempts with short delay)
  const verifyWithRetries = async (verifyPayload, attemptsLeft = 3) => {
    try {
      const verifyRes = await paymentApi.verifyPayment(verifyPayload);

      // Check if server refunded due to hold expiry / seat conflict
      if (verifyRes.data?.success === false || verifyRes.data?.status === 'failed') {
        navigate('/payment/failed', {
          replace: true,
          state: {
            reason:
              verifyRes.data?.message ||
              'Booking confirmation failed due to seat conflict. A full refund has been initiated.',
            refundInitiated: true,
          },
        });
        return;
      }

      navigate(`/booking/${booking._id}/confirmation`, { replace: true });
    } catch (err) {
      const status = err.response?.status;

      // If client signature mismatch (400), don't retry
      if (status === 400) {
        setConfirmingModal(false);
        setPaymentInProgress(false);
        toast.error('Payment verification failed.');
        return;
      }

      // If network / 5xx error and retries remain, wait 2s and retry
      if (attemptsLeft > 1) {
        setTimeout(() => {
          verifyWithRetries(verifyPayload, attemptsLeft - 1);
        }, 2000);
      } else {
        // Retries exhausted
        setConfirmingModal(false);
        setPaymentInProgress(false);
        setVerifyRetryState(verifyPayload);
      }
    }
  };

  // Pay Button Click Handler
  const handlePayClick = async () => {
    if (!booking || paymentInProgress || holdExpired) return;

    setPaymentInProgress(true);
    setVerifyRetryState(null);

    try {
      // 1. Create order on server
      const orderRes = await paymentApi.createOrder(booking._id);
      const { orderId, amount, currency, keyId } = orderRes.data;

      // 2. Re-fetch booking to reflect the extended hold (now + 10 mins)
      try {
        const fresh = await bookingApi.getBooking(booking._id);
        if (fresh?.data) {
          setBooking(fresh.data);
        }
      } catch {
        // Ignore background refresh error
      }

      // 3. Load Razorpay script
      const RazorpaySDK = await loadRazorpay();

      // 4. Configure options
      const options = {
        key: keyId,
        order_id: orderId,
        amount: amount,
        currency: currency || 'INR',
        name: 'IMovies Cinema',
        description: `${booking.show?.movie?.title || 'Movie'} • Seats: ${booking.seats.join(', ')}`,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#f5b301', // Gold accent
        },
        handler: async function (response) {
          setConfirmingModal(true);
          const payload = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          };
          await verifyWithRetries(payload, 3);
        },
        modal: {
          ondismiss: function () {
            setPaymentInProgress(false);
            toast.info('Payment cancelled. You can try again before your hold expires.');
          },
        },
      };

      const rzp = new RazorpaySDK(options);

      // Handle payment.failed event from modal
      rzp.on('payment.failed', async function (response) {
        setPaymentInProgress(false);
        const description = response.error?.description || 'Payment failed';
        toast.error(`Payment failed: ${description}`);
        try {
          await paymentApi.reportFailure(orderId, description);
        } catch {
          // Ignore failure reporting error
        }
      });

      rzp.open();
    } catch (err) {
      setPaymentInProgress(false);
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // Release Seats & Go Back
  const handleReleaseAndBack = async () => {
    if (!window.confirm('Are you sure you want to release these seats and return?')) {
      return;
    }

    try {
      await bookingApi.releaseHold(booking._id);
      toast.info('Seats released.');
      navigate(`/shows/${booking.show?._id || ''}/seats`);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // Invalid ObjectId param guard
  if (!isValidObjectId) {
    return (
      <div className="py-16">
        <ErrorState
          title="Invalid Booking ID"
          message="The booking reference format is invalid."
        />
        <div className="text-center mt-6">
          <Link
            to="/movies"
            className="inline-flex items-center gap-2 text-xs font-semibold text-rose-400"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to movies
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-neutral-400 animate-pulse">
        Loading booking checkout summary...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16">
        <ErrorState title="Checkout Error" message={error} />
        <div className="text-center mt-6">
          <Link
            to="/movies"
            className="inline-flex items-center gap-2 text-xs font-semibold text-rose-400"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to movies
          </Link>
        </div>
      </div>
    );
  }

  // Hold Expired State View
  if (holdExpired) {
    return (
      <div className="py-16 max-w-lg mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mx-auto flex items-center justify-center text-amber-400">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Your Seat Hold Has Expired</h2>
        <p className="text-xs sm:text-sm text-neutral-400">
          Seats are held temporarily while payment is processed. The time limit for this booking has elapsed and the seats have been released back to the public.
        </p>
        <div>
          <Link
            to={`/shows/${booking?.show?._id || ''}/seats`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 font-semibold text-xs sm:text-sm text-white shadow-lg shadow-rose-950/40 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Select Available Seats
          </Link>
        </div>
      </div>
    );
  }

  const show = booking?.show;
  const movie = show?.movie;
  const theatre = show?.theatre;

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      {/* Full-screen confirmation loading overlay */}
      {confirmingModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full border-4 border-rose-500/30 border-t-rose-500 animate-spin" />
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Confirming your payment...
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-sm">
            Please do not close this window or navigate away while we verify your transaction and assign your booking code.
          </p>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Checkout & Payment</h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Booking ID: <code className="text-neutral-300 font-mono">{booking._id}</code>
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-400">Time remaining:</span>
          <HoldTimer
            expiresAt={booking.holdExpiresAt}
            serverOffsetMs={serverOffsetMs}
            onExpire={handleTimerExpire}
          />
        </div>
      </div>

      {/* Unconfirmed verification retry notice (if 3 network retries failed) */}
      {verifyRetryState && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-900 text-xs text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            We couldn't confirm your booking yet due to a network delay.
          </div>
          <p className="text-neutral-300">
            Don't worry, your money is completely safe: if your booking cannot be confirmed, any deducted amount will be automatically refunded by Razorpay.
          </p>
          <button
            onClick={() => {
              setConfirmingModal(true);
              verifyWithRetries(verifyRetryState, 3);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 font-semibold text-neutral-950 text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Check again
          </button>
        </div>
      )}

      {/* Order Summary Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/60 border border-neutral-800 backdrop-blur-md space-y-6">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Poster */}
          <div className="w-24 sm:w-32 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800 shadow-md">
            {movie?.poster ? (
              <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                <Film className="w-8 h-8 text-neutral-600" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 space-y-3">
            <div>
              <h2 className="text-xl font-bold text-white">{movie?.title}</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                {theatre?.name} • {theatre?.city} • {show?.screenName}
              </p>
              <p className="text-xs text-neutral-400">
                {formatDate(show?.startTime)} at {formatTime(show?.startTime)}
              </p>
            </div>

            <div className="pt-2 border-t border-neutral-800/80">
              <span className="text-xs font-semibold text-neutral-400 block mb-1.5">
                Reserved Seats ({booking.seats.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {booking.seats.map((seatLabel) => (
                  <span
                    key={seatLabel}
                    className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-bold text-rose-400"
                  >
                    {seatLabel}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="pt-4 border-t border-neutral-800/80 space-y-2 text-xs">
          <div className="flex justify-between text-neutral-400">
            <span>Ticket Base Amount ({booking.seats.length} seats)</span>
            <span>{formatPrice(booking.amount)}</span>
          </div>
          <div className="flex justify-between text-neutral-400">
            <span>Convenience & Payment Gateway Charges</span>
            <span className="text-emerald-400 font-medium">FREE</span>
          </div>

          <div className="flex justify-between items-center text-lg font-extrabold text-white pt-3 border-t border-neutral-800">
            <span>Grand Total</span>
            <span className="text-amber-400 text-xl font-bold">{formatPrice(booking.amount)}</span>
          </div>
        </div>

        {/* Security Notice */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 text-[11px] text-neutral-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Test mode enabled. 256-bit encrypted checkout verified by Razorpay official cryptographic signature.
          </span>
        </div>

        {/* Actions */}
        <div className="pt-2 space-y-3">
          <button
            type="button"
            disabled={paymentInProgress || holdExpired}
            onClick={handlePayClick}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 font-bold text-sm text-neutral-950 shadow-xl shadow-amber-950/30 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CreditCard className="w-4 h-4" />
            <span>{paymentInProgress ? 'Opening Checkout...' : `Pay ${formatPrice(booking.amount)}`}</span>
          </button>

          <button
            type="button"
            disabled={paymentInProgress}
            onClick={handleReleaseAndBack}
            className="w-full py-2.5 rounded-xl text-xs font-medium text-neutral-400 hover:text-rose-400 transition-colors flex items-center justify-center gap-1.5"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Release seats and go back</span>
          </button>
        </div>
      </div>
    </div>
  );
}
