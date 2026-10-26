import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { showApi } from '../api/showApi.js';
import { bookingApi } from '../api/bookingApi.js';
import { useFetch } from '../hooks/useFetch.js';
import { useSeatMap } from '../hooks/useSeatMap.js';
import { getErrorMessage } from '../api/axios.js';
import SeatGrid from '../components/SeatGrid.jsx';
import SeatLegend from '../components/SeatLegend.jsx';
import BookingSummary from '../components/BookingSummary.jsx';
import ConnectionBadge from '../components/ConnectionBadge.jsx';
import ErrorState from '../components/ErrorState.jsx';
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
  const [heldBooking, setHeldBooking] = useState(null); // { _id, seats, amount, holdExpiresAt }
  const [loadingHold, setLoadingHold] = useState(false);

  // Ref to track if user has active hold for unmount/beforeunload warnings
  const isHeldModeRef = useRef(false);
  isHeldModeRef.current = isHeldMode;

  // 4. Resume hold state if seats have isMine: true on initial load
  useEffect(() => {
    if (!isHeldMode && seats.length > 0) {
      const mySeats = seats.filter((s) => s.isMine).map((s) => s.label);
      if (mySeats.length > 0) {
        setIsHeldMode(true);
        // Note: Server GET /shows/:id/seats only returns isMine: true, without booking._id or holdExpiresAt.
        // We set a fallback object so the user sees their seats and can release them or start over.
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
        if (selectedSeats.includes(seat.label) && seat.status !== 'available' && !seat.isMine) {
          unavailable.add(seat.label);
        }
      });

      if (unavailable.size > 0) {
        setSelectedSeats((prev) => prev.filter((label) => !unavailable.has(label)));
        toast.warn(`Seats [${Array.from(unavailable).join(', ')}] were taken and removed from your selection.`);
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

  // Hold Seats API Call
  const handleHoldSeats = async () => {
    if (selectedSeats.length === 0 || loadingHold) return;

    setLoadingHold(true);
    try {
      const res = await bookingApi.holdSeats(showId, selectedSeats);
      const data = res.data?.data;

      if (data) {
        setHeldBooking(data);
        setIsHeldMode(true);
        toast.success(`Held ${data.seats.length} seats for 5 minutes!`);
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
      // If booking ID was not known (resumed session without ID), reset locally and refetch
      setIsHeldMode(false);
      setHeldBooking(null);
      setSelectedSeats([]);
      refetchSeats();
      toast.info('Hold released locally.');
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

  // Proceed to Checkout
  const handleProceedPayment = () => {
    if (heldBooking?._id) {
      navigate(`/checkout/${heldBooking._id}`);
    } else {
      toast.error('Booking reference not available. Please release and re-hold your seats.');
    }
  };

  // Guard: Show not found or past show
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
            className="inline-flex items-center gap-2 text-xs font-semibold text-rose-400 hover:text-rose-300"
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
        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-900/40 text-amber-300 text-sm">
          <AlertCircle className="w-6 h-6 mx-auto mb-2 text-amber-400" />
          This show has already started or concluded. Please pick an upcoming showtime.
        </div>
        <Link
          to={`/movies/${show?.movie?._id || ''}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-rose-400"
        >
          <ArrowLeft className="w-4 h-4" />
          Choose another showtime
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-6">
      {/* Top Navigation & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/movies/${show?.movie?._id || ''}`}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white line-clamp-1">
              {show?.movie?.title}
            </h1>
            <p className="text-xs text-neutral-400">
              {show?.theatre?.name} • {show?.screenName} • {show?.language}
            </p>
          </div>
        </div>

        <ConnectionBadge connected={connected} />
      </div>

      {/* Main Grid & Summary Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Seat Grid & Legend */}
        <div className="lg:col-span-8 space-y-8">
          <SeatLegend />

          {seatsError ? (
            <ErrorState message={seatsError} onRetry={refetchSeats} />
          ) : seatsLoading ? (
            <div className="py-24 text-center text-xs text-neutral-400 animate-pulse">
              Preparing live seat layout...
            </div>
          ) : (
            <SeatGrid
              layout={layout}
              seats={seats}
              selectedSeats={selectedSeats}
              heldSeats={heldBooking?.seats || []}
              onToggleSeat={handleToggleSeat}
              isHeldMode={isHeldMode}
            />
          )}
        </div>

        {/* Right: Booking Summary Sidebar */}
        <div className="lg:col-span-4 sticky top-24">
          <BookingSummary
            show={show}
            selectedSeats={selectedSeats}
            price={price}
            isHeldMode={isHeldMode}
            heldBooking={heldBooking}
            serverOffsetMs={serverOffsetMs}
            loadingHold={loadingHold}
            onHoldSeats={handleHoldSeats}
            onReleaseHold={handleReleaseHold}
            onProceedPayment={handleProceedPayment}
            onTimerExpire={handleTimerExpire}
          />
        </div>
      </div>
    </div>
  );
}
