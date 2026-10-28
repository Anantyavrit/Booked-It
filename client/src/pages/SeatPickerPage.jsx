import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Armchair, ArrowRight, Loader2, XCircle } from 'lucide-react';
import { showApi } from '../api/showApi.js';
import { bookingApi } from '../api/bookingApi.js';
import { useFetch } from '../hooks/useFetch.js';
import { useSeatMap } from '../hooks/useSeatMap.js';
import { getErrorMessage } from '../api/axios.js';
import SeatGrid from '../components/SeatGrid.jsx';
import SeatLegend from '../components/SeatLegend.jsx';
import BookingSummary from '../components/BookingSummary.jsx';
import ConnectionBadge from '../components/ConnectionBadge.jsx';
import HoldTimer from '../components/HoldTimer.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { formatPrice, formatTime, formatDate } from '../utils/format.js';
import { toast } from 'react-toastify';

const MAX_SEATS = 6;

export default function SeatPickerPage() {
  const { showId } = useParams();
  const navigate = useNavigate();

  // 1. Fetch Show Details
  const {
    data: showData,
    loading: showLoading,
    error: showError,
  } = useFetch(() => showApi.getShow(showId), [showId]);

  const show = showData?.data;

  useEffect(() => {
    if (show?.movie?.title) {
      document.title = `Select Seats — ${show.movie.title} | IMovies`;
    } else {
      document.title = 'Select Seats — IMovies';
    }
  }, [show?.movie?.title]);

  // 2. Real-time Seat Map
  const {
    layout,
    price,
    seats,
    loading: seatsLoading,
    error: seatsError,
    refetch: refetchSeats,
    connected,
    serverOffsetMs,
  } = useSeatMap(showId);

  // 3. Selection & Hold State
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [isHeldMode, setIsHeldMode] = useState(false);
  const [heldBooking, setHeldBooking] = useState(null);
  const [loadingHold, setLoadingHold] = useState(false);

  const isHeldModeRef = useRef(false);
  isHeldModeRef.current = isHeldMode;

  // 4. Resume hold state if seats have isMine: true on initial load
  useEffect(() => {
    if (!isHeldMode && seats.length > 0) {
      const mySeats = seats.filter((s) => s.isMine).map((s) => s.label);
      if (mySeats.length > 0) {
        setIsHeldMode(true);
        setHeldBooking({
          _id: null,
          seats: mySeats,
          amount: mySeats.length * price,
          holdExpiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        });
      }
    }
  }, [seats, isHeldMode, price]);

  // 5. Deselect any seat that turns held/booked by others while selected
  useEffect(() => {
    if (!isHeldMode && selectedSeats.length > 0) {
      const unavailable = new Set();
      seats.forEach((seat) => {
        if (
          selectedSeats.includes(seat.label) &&
          seat.status !== 'available' &&
          !seat.isMine
        ) {
          unavailable.add(seat.label);
        }
      });

      if (unavailable.size > 0) {
        setSelectedSeats((prev) =>
          prev.filter((label) => !unavailable.has(label))
        );
        toast.warn(
          `Seat ${Array.from(unavailable).join(', ')} was just taken and deselected.`
        );
      }
    }
  }, [seats, selectedSeats, isHeldMode]);

  // 6. Beforeunload window event
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isHeldModeRef.current) {
        e.preventDefault();
        e.returnValue = 'Your seats will remain held until the timer expires.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Seat toggle handler
  const handleToggleSeat = useCallback(
    (label) => {
      if (isHeldMode) return;

      setSelectedSeats((prev) => {
        if (prev.includes(label)) {
          return prev.filter((l) => l !== label);
        }
        if (prev.length >= MAX_SEATS) {
          toast.info(`You can select up to ${MAX_SEATS} seats per booking.`);
          return prev;
        }
        return [...prev, label];
      });
    },
    [isHeldMode]
  );

  // Unified Hold & Continue to Pay handler
  const handleContinueToPay = async () => {
    // If already in held mode with booking ID, proceed straight to checkout
    if (isHeldMode && heldBooking?._id) {
      navigate(`/checkout/${heldBooking._id}`);
      return;
    }

    if (selectedSeats.length === 0 || loadingHold) return;

    setLoadingHold(true);
    try {
      const res = await bookingApi.holdSeats(showId, selectedSeats);
      const data = res.data?.data;

      if (data?._id) {
        setHeldBooking(data);
        setIsHeldMode(true);
        navigate(`/checkout/${data._id}`);
      }
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error('Some selected seats were just taken. Please re-select available seats.');
        refetchSeats();
        setSelectedSeats([]);
      } else {
        toast.error(getErrorMessage(err));
      }
    } finally {
      setLoadingHold(false);
    }
  };

  // Release Seats API Call
  const handleReleaseHold = async () => {
    if (!heldBooking?._id) {
      setIsHeldMode(false);
      setHeldBooking(null);
      setSelectedSeats([]);
      refetchSeats();
      toast.info('Hold released.');
      return;
    }

    try {
      await bookingApi.releaseHold(heldBooking._id);
      setIsHeldMode(false);
      setHeldBooking(null);
      setSelectedSeats([]);
      toast.info('Seats released successfully.');
      refetchSeats();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // Timer Expiration Callback
  const handleTimerExpire = useCallback(() => {
    toast.warn('Your seat hold has expired.');
    setIsHeldMode(false);
    setHeldBooking(null);
    setSelectedSeats([]);
    refetchSeats();
  }, [refetchSeats]);

  // Guard: Show not found
  if (showError || (!showLoading && !show)) {
    return (
      <div className="py-16">
        <ErrorState
          title="Show Not Found"
          message={showError || 'The requested show is unavailable or no longer scheduled.'}
        />
        <div className="text-center mt-6">
          <Link
            to="/movies"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#e50914] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to movies
          </Link>
        </div>
      </div>
    );
  }

  const isPastShow = show && new Date(show.startTime) <= new Date();
  if (!showLoading && isPastShow) {
    return (
      <div className="py-16 max-w-lg mx-auto text-center space-y-4">
        <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-900/40 text-amber-300 text-sm">
          <AlertCircle className="w-6 h-6 mx-auto mb-2 text-amber-400" />
          This show has already started. Please pick an upcoming showtime.
        </div>
        <Link
          to={`/movies/${show?.movie?._id || ''}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#e50914] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Choose another showtime
        </Link>
      </div>
    );
  }

  const activeSeatsCount = isHeldMode
    ? heldBooking?.seats?.length || selectedSeats.length
    : selectedSeats.length;

  const totalAmount =
    isHeldMode && heldBooking?.amount !== undefined
      ? heldBooking.amount
      : activeSeatsCount * price;

  const displaySeatsList = isHeldMode
    ? heldBooking?.seats || selectedSeats
    : selectedSeats;

  return (
    <div className="space-y-6 py-4 sm:py-6 pb-32">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2a2a30] pb-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/movies/${show?.movie?._id || ''}`}
            className="p-2 rounded-md bg-[#18181c] border border-[#2a2a30] text-[#92929e] hover:text-[#f4f4f6] hover:bg-[#222227] transition-colors"
            aria-label="Back to movie details"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-['Outfit'] text-lg sm:text-xl font-bold text-[#f4f4f6] line-clamp-1">
              {show?.movie?.title}
            </h1>
            <p className="text-xs text-[#92929e]">
              {show?.theatre?.name} • {show?.screenName} • {formatDate(show?.startTime)} at {formatTime(show?.startTime)}
            </p>
          </div>
        </div>

        <ConnectionBadge connected={connected} />
      </div>

      {/* Main Seat Matrix & Legend Area */}
      <div className="space-y-6">
        <SeatLegend />

        {seatsError ? (
          <ErrorState message={seatsError} onRetry={refetchSeats} />
        ) : seatsLoading ? (
          <div className="py-24 text-center text-xs text-[#92929e] animate-pulse">
            Loading theatre seating layout...
          </div>
        ) : (
          <SeatGrid
            layout={layout}
            seats={seats}
            selectedSeats={selectedSeats}
            heldSeats={heldBooking?.seats || []}
            price={price}
            onToggleSeat={handleToggleSeat}
            isHeldMode={isHeldMode}
          />
        )}
      </div>

      {/* 5. Sticky Bottom Summary Bar (selected seats count, total amount, Continue to Pay button) */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-[#18181c] border-t border-[#2a2a30] p-3 sm:p-4 shadow-2xl animate-in slide-in-from-bottom-2 duration-150">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Selected seats count & total amount */}
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-['Outfit'] font-bold text-sm sm:text-base text-[#f4f4f6]">
                  {activeSeatsCount > 0
                    ? `${activeSeatsCount} Seat${activeSeatsCount > 1 ? 's' : ''}`
                    : 'Select Seats'}
                </span>
                {displaySeatsList.length > 0 && (
                  <span className="text-xs text-[#92929e] truncate max-w-[140px] sm:max-w-[220px]">
                    ({displaySeatsList.join(', ')})
                  </span>
                )}
              </div>
              <div className="text-xs text-[#92929e] mt-0.5">
                Total: <span className="font-bold text-[#e50914] text-sm">{formatPrice(totalAmount)}</span>
              </div>
            </div>

            {/* Timer if in held mode */}
            {isHeldMode && heldBooking?.holdExpiresAt && (
              <div className="shrink-0">
                <HoldTimer
                  expiresAt={heldBooking.holdExpiresAt}
                  serverOffsetMs={serverOffsetMs}
                  onExpire={handleTimerExpire}
                />
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {isHeldMode && (
              <button
                type="button"
                onClick={handleReleaseHold}
                className="btn-base px-3 py-2 rounded-md bg-[#0f0f11] hover:bg-[#222227] border border-[#2a2a30] text-xs font-medium text-[#92929e] hover:text-[#f4f4f6] transition-colors cursor-pointer gap-1"
              >
                <XCircle className="w-3.5 h-3.5 text-[#e50914]" />
                <span className="hidden sm:inline">Release</span>
              </button>
            )}

            <button
              type="button"
              disabled={activeSeatsCount === 0 || loadingHold}
              onClick={handleContinueToPay}
              className="btn-base flex-1 sm:flex-initial px-6 py-2.5 rounded-md bg-[#e50914] hover:bg-[#c80812] disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs sm:text-sm text-white transition-colors cursor-pointer gap-2"
            >
              {loadingHold ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Securing Seats...</span>
                </>
              ) : (
                <>
                  <span>Continue to Pay</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
