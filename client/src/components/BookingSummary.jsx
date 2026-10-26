import React from 'react';
import { Armchair, ArrowRight, XCircle } from 'lucide-react';
import { formatPrice, formatTime, formatDate } from '../utils/format.js';
import HoldTimer from './HoldTimer.jsx';

export default function BookingSummary({
  show,
  selectedSeats = [],
  price = 0,
  isHeldMode = false,
  heldBooking = null,
  serverOffsetMs = 0,
  loadingHold = false,
  onHoldSeats,
  onReleaseHold,
  onProceedPayment,
  onTimerExpire,
}) {
  const count = isHeldMode ? heldBooking?.seats?.length || selectedSeats.length : selectedSeats.length;

  // Amount: preview based on count * price, or the authoritative server amount once held
  const displayAmount = isHeldMode && heldBooking?.amount !== undefined
    ? heldBooking.amount
    : count * price;

  const seatsList = isHeldMode ? heldBooking?.seats || selectedSeats : selectedSeats;

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-neutral-900/90 border border-neutral-800 shadow-xl space-y-6">
      {/* Show & Movie Header */}
      <div className="space-y-1.5 border-b border-neutral-800 pb-4">
        <h3 className="font-bold text-lg text-white line-clamp-1">{show?.movie?.title}</h3>
        <p className="text-xs text-neutral-400">
          {show?.theatre?.name} • {show?.screenName}
        </p>
        <p className="text-xs text-neutral-400">
          {formatDate(show?.startTime)} at {formatTime(show?.startTime)}
        </p>
      </div>

      {/* Selected Seats Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-neutral-400">
          <span className="flex items-center gap-1.5">
            <Armchair className="w-4 h-4 text-rose-500" />
            {isHeldMode ? 'Held Seats' : 'Selected Seats'} ({count})
          </span>
          {isHeldMode && heldBooking?.holdExpiresAt && (
            <HoldTimer
              expiresAt={heldBooking.holdExpiresAt}
              serverOffsetMs={serverOffsetMs}
              onExpire={onTimerExpire}
            />
          )}
        </div>

        {seatsList.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {seatsList.map((label) => (
              <span
                key={label}
                className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-bold text-rose-400"
              >
                {label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-500 italic">No seats selected yet</p>
        )}
      </div>

      {/* Pricing Breakdown */}
      <div className="pt-2 border-t border-neutral-800 space-y-2 text-xs">
        <div className="flex justify-between text-neutral-400">
          <span>Ticket Price ({count} × {formatPrice(price)})</span>
          <span>{formatPrice(displayAmount)}</span>
        </div>

        <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-neutral-800">
          <span>Total Amount</span>
          <span className="text-rose-400">{formatPrice(displayAmount)}</span>
        </div>
        {isHeldMode && (
          <p className="text-[10px] text-emerald-400 italic">
            Authoritative amount verified by server
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="pt-2 space-y-2">
        {!isHeldMode ? (
          <button
            type="button"
            disabled={count === 0 || loadingHold}
            onClick={onHoldSeats}
            className="w-full py-3.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs sm:text-sm text-white shadow-lg shadow-rose-950/40 transition-all flex items-center justify-center gap-2"
          >
            {loadingHold ? (
              <span>Securing Hold...</span>
            ) : (
              <>
                <span>Hold Seats (5 Mins)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onProceedPayment}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs sm:text-sm text-white shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2"
            >
              <span>Proceed to Payment</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onReleaseHold}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 font-medium text-xs text-neutral-300 transition-colors flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>Release Seats</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
