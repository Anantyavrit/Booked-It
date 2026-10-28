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
  Loader2,
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
  const [verifyRetryState, setVerifyRetryState] = useState(null);
  const [holdExpired, setHoldExpired] = useState(false);

  const isPayingRef = useRef(false);
  isPayingRef.current = paymentInProgress || confirmingModal;

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

      if (status === 400) {
        setConfirmingModal(false);
        setPaymentInProgress(false);
        toast.error('Payment verification failed.');
        return;
      }

      if (attemptsLeft > 1) {
        setTimeout(() => {
          verifyWithRetries(verifyPayload, attemptsLeft - 1);
        }, 2000);
      } else {
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

      // 2. Re-fetch booking to reflect the extended hold
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
          color: '#e50914',
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
            toast.info('Payment cancelled. You can retry before your hold timer expires.');
          },
        },
      };

      const rzp = new RazorpaySDK(options);

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
    if (!window.confirm('Are you sure you want to release these seats and return to seat selection?')) {
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
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#e50914] hover:underline"
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
      <div className="py-24 text-center text-xs text-[#92929e] animate-pulse">
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
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#e50914] hover:underline"
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
      <div className="py-16 max-w-lg mx-auto text-center space-y-5">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 mx-auto flex items-center justify-center text-amber-400">
          <Clock className="w-7 h-7" />
        </div>
        <h2 className="font-['Outfit'] text-2xl font-bold text-[#f4f4f6] tracking-tight">
          Your Seat Hold Has Expired
        </h2>
        <p className="text-xs sm:text-sm text-[#92929e] leading-relaxed">
          The hold window for these seats has elapsed and they have been released back to the general audience. Please re-select your seats to proceed.
        </p>
        <div className="pt-2">
          <Link
            to={`/shows/${booking?.show?._id || ''}/seats`}
            className="btn-base px-6 py-2.5 rounded-md bg-[#e50914] hover:bg-[#c80812] font-semibold text-xs text-white transition-colors gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Select Available Seats</span>
          </Link>
        </div>
      </div>
    );
  }

  const show = booking?.show;
  const movie = show?.movie;
  const theatre = show?.theatre;

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-8 space-y-6">
      {/* Full-screen confirmation loading overlay */}
      {confirmingModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in duration-200">
          <Loader2 className="w-12 h-12 text-[#e50914] animate-spin" />
          <h2 className="font-['Outfit'] text-xl sm:text-2xl font-bold text-[#f4f4f6] tracking-tight">
            Confirming your booking...
          </h2>
          <p className="text-xs sm:text-sm text-[#92929e] max-w-sm">
            Please do not close this window while we verify your transaction and issue your cinema ticket code.
          </p>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2a2a30] pb-4">
        <div>
          <h1 className="font-['Outfit'] text-2xl font-bold text-[#f4f4f6] tracking-tight">
            Checkout & Order Summary
          </h1>
          <p className="text-xs text-[#92929e] mt-0.5">
            Booking ID: <code className="text-[#f4f4f6] font-mono text-[11px]">{booking._id}</code>
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#92929e]">Seat hold timer:</span>
          <HoldTimer
            expiresAt={booking.holdExpiresAt}
            serverOffsetMs={serverOffsetMs}
            onExpire={handleTimerExpire}
          />
        </div>
      </div>

      {/* Unconfirmed verification retry notice */}
      {verifyRetryState && (
        <div className="p-4 rounded-lg bg-amber-950/30 border border-amber-900/60 text-xs text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Confirmation is taking a moment due to a network delay.</span>
          </div>
          <p className="text-[#92929e]">
            Your payment is secure. Click below to re-check your booking status.
          </p>
          <button
            type="button"
            onClick={() => {
              setConfirmingModal(true);
              verifyWithRetries(verifyRetryState, 3);
            }}
            className="btn-base px-3.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs transition-colors gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Check status again</span>
          </button>
        </div>
      )}

      {/* Order Summary Card */}
      <div className="p-5 sm:p-7 rounded-lg bg-[#18181c] border border-[#2a2a30] shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          {/* Poster */}
          <div className="w-24 sm:w-28 aspect-[2/3] shrink-0 rounded-md overflow-hidden bg-[#0f0f11] border border-[#2a2a30]">
            {movie?.poster ? (
              <img
                src={movie.poster}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#0f0f11] text-[#92929e]">
                <Film className="w-6 h-6" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 space-y-2.5">
            <div>
              <h2 className="font-['Outfit'] text-xl font-bold text-[#f4f4f6]">
                {movie?.title}
              </h2>
              <p className="text-xs text-[#92929e] mt-0.5">
                {theatre?.name} • {theatre?.city} • {show?.screenName}
              </p>
              <p className="text-xs text-[#92929e]">
                {formatDate(show?.startTime)} at {formatTime(show?.startTime)}
              </p>
            </div>

            <div className="pt-2 border-t border-[#2a2a30]">
              <span className="text-xs font-semibold text-[#92929e] block mb-1.5">
                Reserved Seats ({booking.seats.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {booking.seats.map((seatLabel) => (
                  <span
                    key={seatLabel}
                    className="px-2 py-0.5 rounded bg-[#0f0f11] border border-[#2a2a30] text-xs font-bold text-[#f4f4f6]"
                  >
                    {seatLabel}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="pt-4 border-t border-[#2a2a30] space-y-2 text-xs">
          <div className="flex justify-between text-[#92929e]">
            <span>Ticket Base Amount ({booking.seats.length} seats)</span>
            <span className="text-[#f4f4f6]">{formatPrice(booking.amount)}</span>
          </div>
          <div className="flex justify-between text-[#92929e]">
            <span>Convenience & Booking Fee</span>
            <span className="text-emerald-400 font-semibold">FREE (₹0)</span>
          </div>

          <div className="flex justify-between items-center text-base font-bold text-[#f4f4f6] pt-3 border-t border-[#2a2a30]">
            <span>Grand Total</span>
            <span className="text-xl font-bold text-[#e50914]">
              {formatPrice(booking.amount)}
            </span>
          </div>
        </div>

        {/* Security / Compliance Badge */}
        <div className="flex items-center gap-2 p-3 rounded bg-[#0f0f11] border border-[#2a2a30] text-[11px] text-[#92929e]">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            256-bit encrypted checkout verified by Razorpay cryptographic signature.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          <button
            type="button"
            disabled={paymentInProgress || holdExpired}
            onClick={handlePayClick}
            className="btn-base w-full py-3 rounded-md bg-[#e50914] hover:bg-[#c80812] font-semibold text-sm text-white transition-colors cursor-pointer gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {paymentInProgress ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Opening Checkout...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>Pay {formatPrice(booking.amount)}</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={paymentInProgress}
            onClick={handleReleaseAndBack}
            className="w-full py-2 text-xs font-medium text-[#92929e] hover:text-[#e50914] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Release seats and go back</span>
          </button>
        </div>
      </div>
    </div>
  );
}
