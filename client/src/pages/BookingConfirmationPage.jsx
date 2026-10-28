import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Copy, Check, Printer, Home, AlertCircle, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
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
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const pollIntervalRef = useRef(null);
  const pollTimeoutRef = useRef(null);

  const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id || '');

  useEffect(() => {
    document.title = 'Ticket Confirmed — IMovies';
  }, []);

  // Poll for confirmed status if transitioning from payment gateway
  useEffect(() => {
    if (!isValidObjectId) return;

    let isMounted = true;
    let pollCount = 0;
    const maxPolls = 10;

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
    pollIntervalRef.current = setInterval(checkStatus, 2500);

    return () => {
      isMounted = false;
      clearInterval(pollIntervalRef.current);
      clearTimeout(pollTimeoutRef.current);
    };
  }, [id, isValidObjectId]);

  // Generate authentic QR code data URL once booking is loaded
  useEffect(() => {
    if (booking?.bookingCode) {
      const qrPayload = JSON.stringify({
        bookingCode: booking.bookingCode,
        id: booking._id,
        seats: booking.seats,
        showId: booking.show?._id,
      });

      QRCode.toDataURL(qrPayload, {
        width: 180,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error('Failed to generate QR code:', err));
    }
  }, [booking]);

  const handleCopyCode = () => {
    if (booking?.bookingCode) {
      navigator.clipboard.writeText(booking.bookingCode);
      setCopied(true);
      toast.success('Cinema entry code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isValidObjectId) {
    return (
      <div className="py-16">
        <ErrorState
          title="Invalid Reference ID"
          message="The booking reference identifier format is invalid."
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-[#e50914]/30 border-t-[#e50914] animate-spin mx-auto" />
        <h2 className="font-['Outfit'] text-xl font-bold text-[#f4f4f6]">
          Issuing your cinema e-ticket...
        </h2>
        <p className="text-xs text-[#92929e]">
          Verifying payment confirmation and assigning seats.
        </p>
      </div>
    );
  }

  if (isStillProcessing) {
    return (
      <div className="py-16 max-w-lg mx-auto text-center space-y-5">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 mx-auto flex items-center justify-center text-amber-400">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="font-['Outfit'] text-2xl font-bold text-[#f4f4f6]">
          Payment Still Processing
        </h2>
        <p className="text-xs sm:text-sm text-[#92929e] leading-relaxed">
          Your payment verification is taking slightly longer than usual. Your seats are reserved and your e-ticket will appear in your bookings once confirmed.
        </p>
        <div className="pt-2">
          <Link
            to="/movies"
            className="btn-base px-6 py-2.5 rounded-md bg-[#18181c] border border-[#2a2a30] text-xs font-semibold text-[#f4f4f6] hover:bg-[#222227] transition-colors"
          >
            Explore Movies
          </Link>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="py-16">
        <ErrorState
          title="Confirmation Unavailable"
          message={error || 'Booking voucher could not be loaded.'}
        />
        <div className="text-center mt-6">
          <Link
            to="/movies"
            className="text-xs text-[#e50914] hover:underline font-medium"
          >
            ← Back to movies
          </Link>
        </div>
      </div>
    );
  }

  const show = booking.show;
  const movie = show?.movie;
  const theatre = show?.theatre;

  return (
    <div className="max-w-xl mx-auto py-6 sm:py-8 space-y-6 print:py-0 print:m-0 print:max-w-none">
      {/* 1. Ticket-Style Voucher Container */}
      <div className="rounded-2xl bg-[#18181c] border border-[#2a2a30] shadow-2xl relative overflow-hidden print:border print:border-neutral-300 print:bg-white print:text-neutral-900 print:shadow-none">
        {/* Top Header Banner */}
        <div className="bg-[#222227] print:bg-neutral-100 p-5 text-center border-b border-[#2a2a30] print:border-neutral-300">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mb-2">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 print:text-emerald-700">
            Booking Confirmed
          </div>
          <h1 className="font-['Outfit'] text-xl sm:text-2xl font-extrabold text-[#f4f4f6] print:text-neutral-900 mt-0.5">
            E-Ticket Voucher
          </h1>
          <p className="text-xs text-[#92929e] print:text-neutral-600 mt-1">
            Show this ticket or scan the QR code at the cinema entry gate.
          </p>
        </div>

        {/* Voucher Main Body */}
        <div className="p-6 sm:p-7 space-y-5">
          {/* Movie Title & Screen */}
          <div className="flex justify-between items-start gap-4">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#92929e] print:text-neutral-500 block font-semibold">
                Movie
              </span>
              <h2 className="font-['Outfit'] text-lg sm:text-xl font-bold text-[#f4f4f6] print:text-neutral-900 mt-0.5">
                {movie?.title}
              </h2>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] uppercase tracking-wider text-[#92929e] print:text-neutral-500 block font-semibold">
                Auditorium
              </span>
              <span className="font-semibold text-sm text-[#f4f4f6] print:text-neutral-900 mt-0.5 block">
                {show?.screenName || 'Screen 1'}
              </span>
            </div>
          </div>

          {/* Theatre Location */}
          <div>
            <span className="text-[11px] uppercase tracking-wider text-[#92929e] print:text-neutral-500 block font-semibold">
              Cinema & Address
            </span>
            <p className="text-xs sm:text-sm font-medium text-[#f4f4f6] print:text-neutral-900 mt-0.5">
              {theatre?.name}
            </p>
            <p className="text-xs text-[#92929e] print:text-neutral-600">
              {theatre?.address}, {theatre?.city}
            </p>
          </div>

          {/* Date, Time & Language */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#92929e] print:text-neutral-500 block font-semibold">
                Date & Showtime
              </span>
              <p className="text-xs sm:text-sm font-semibold text-[#f4f4f6] print:text-neutral-900 mt-0.5">
                {formatDate(show?.startTime)}
              </p>
              <p className="text-xs text-[#e50914] print:text-neutral-800 font-bold">
                {formatTime(show?.startTime)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-[#92929e] print:text-neutral-500 block font-semibold">
                Language & Format
              </span>
              <p className="text-xs sm:text-sm font-semibold text-[#f4f4f6] print:text-neutral-900 mt-0.5">
                {show?.language || 'Original'}
              </p>
              <p className="text-xs text-[#92929e] print:text-neutral-600">
                {movie?.formats?.[0] || '2D Standard'}
              </p>
            </div>
          </div>

          {/* Confirmed Seats Box */}
          <div className="p-3.5 rounded-lg bg-[#0f0f11] border border-[#2a2a30] print:bg-neutral-100 print:border-neutral-300">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#92929e] print:text-neutral-600 block mb-1.5">
              Confirmed Seats ({booking.seats.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {booking.seats.map((seatLabel) => (
                <span
                  key={seatLabel}
                  className="px-2.5 py-1 rounded bg-[#18181c] border border-[#2a2a30] text-xs font-bold text-[#e50914] print:bg-white print:border-neutral-400 print:text-black"
                >
                  {seatLabel}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Perforated Tear Line with Semicircle Notches */}
        <div className="relative my-1">
          {/* Left Cutout */}
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#0f0f11] border-r border-[#2a2a30] print:hidden" />
          {/* Dashed Line */}
          <div className="border-t-2 border-dashed border-[#2a2a30] print:border-neutral-400 mx-5" />
          {/* Right Cutout */}
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#0f0f11] border-l border-[#2a2a30] print:hidden" />
        </div>

        {/* Bottom Voucher Stub: QR Code & Booking Code */}
        <div className="p-6 sm:p-7 bg-[#141418] print:bg-white flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Left: Cinema Entry Code */}
          <div className="space-y-2 text-center sm:text-left">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#92929e] print:text-neutral-600 block">
              Gate Entry Booking Code
            </span>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="font-mono text-2xl font-black text-[#f4f4f6] print:text-black tracking-wider">
                {booking.bookingCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-1.5 rounded bg-[#18181c] hover:bg-[#222227] border border-[#2a2a30] text-[#92929e] hover:text-[#f4f4f6] transition-colors print:hidden cursor-pointer"
                title="Copy Code"
                aria-label="Copy booking code"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <div className="text-[11px] text-[#92929e] print:text-neutral-600">
              Total Paid:{' '}
              <span className="font-bold text-[#f4f4f6] print:text-black">
                {formatPrice(booking.amount)}
              </span>
            </div>
          </div>

          {/* Right: Authentic QR Code */}
          <div className="shrink-0 flex flex-col items-center">
            {qrCodeUrl ? (
              <div className="p-2 rounded-lg bg-white border border-[#2a2a30] print:border-neutral-400 shadow-md">
                <img
                  src={qrCodeUrl}
                  alt={`QR Code for Booking ${booking.bookingCode}`}
                  className="w-28 h-28 object-contain"
                />
              </div>
            ) : (
              <div className="w-28 h-28 rounded-lg bg-[#0f0f11] border border-[#2a2a30] flex items-center justify-center text-[#92929e]">
                <QrCode className="w-8 h-8" />
              </div>
            )}
            <span className="text-[9px] uppercase tracking-wider font-semibold text-[#92929e] print:text-neutral-600 mt-1">
              Scan for entry
            </span>
          </div>
        </div>
      </div>

      {/* 2. Action Buttons (Print & Navigation) */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          className="btn-base px-4 py-2.5 rounded-md bg-[#18181c] hover:bg-[#222227] border border-[#2a2a30] text-xs font-semibold text-[#f4f4f6] transition-colors cursor-pointer gap-2"
        >
          <Printer className="w-4 h-4 text-[#92929e]" />
          <span>Print / Save Ticket</span>
        </button>

        <Link
          to="/"
          className="btn-base px-5 py-2.5 rounded-md bg-[#e50914] hover:bg-[#c80812] text-xs font-semibold text-white transition-colors gap-2"
        >
          <Home className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
}
