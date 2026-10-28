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
  const count = isHeldMode
    ? heldBooking?.seats?.length || selectedSeats.length
    : selectedSeats.length;

  const displayAmount =
    isHeldMode && heldBooking?.amount !== undefined
      ? heldBooking.amount
      : count * price;

  const seatsList = isHeldMode
    ? heldBooking?.seats || selectedSeats
    : selectedSeats;

  return (
    <div className="p-5 rounded-lg bg-[#18181c] border border-[#2a2a30] shadow-xl space-y-5">
      {/* Show & Movie Header */}
      <div className="space-y-1 border-b border-[#2a2a30] pb-3">
        <h3 className="font-['Outfit'] font-bold text-base text-[#f4f4f6] line-clamp-1">
          {show?.movie?.title}
        </h3>
        <p className="text-xs text-[#92929e]">
          {show?.theatre?.name} • {show?.screenName}
        </p>
        <p className="text-xs text-[#92929e]">
          {formatDate(show?.startTime)} at {formatTime(show?.startTime)}
        </p>
      </div>

      {/* Selected Seats */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-[#92929e]">
          <span className="flex items-center gap-1.5 text-[#f4f4f6]">
            <Armchair className="w-3.5 h-3.5 text-[#e50914]" />
            <span>{isHeldMode ? 'Held Seats' : 'Selected Seats'} ({count})</span>
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
          <div className="flex flex-wrap gap-1">
            {seatsList.map((label) => (
              <span
                key={label}
                className="px-2 py-0.5 rounded bg-[#0f0f11] border border-[#2a2a30] text-xs font-semibold text-[#f4f4f6]"
              >
                {label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#92929e] italic">No seats selected yet</p>
        )}
      </div>

      {/* Pricing Breakdown */}
      <div className="pt-2 border-t border-[#2a2a30] space-y-1.5 text-xs">
        <div className="flex justify-between text-[#92929e]">
          <span>Tickets ({count} × {formatPrice(price)})</span>
          <span className="text-[#f4f4f6]">{formatPrice(displayAmount)}</span>
        </div>

        <div className="flex justify-between text-base font-bold text-[#f4f4f6] pt-2 border-t border-[#2a2a30]">
          <span>Total Amount</span>
          <span className="text-[#e50914]">{formatPrice(displayAmount)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-2 space-y-2">
        {!isHeldMode ? (
          <button
            type="button"
            disabled={count === 0 || loadingHold}
            onClick={onHoldSeats}
            className="btn-base w-full py-2.5 rounded-md bg-[#e50914] hover:bg-[#c80812] disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs text-white transition-colors cursor-pointer gap-2"
          >
            {loadingHold ? (
              <span>Securing Hold...</span>
            ) : (
              <>
                <span>Continue to Pay</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onProceedPayment}
              className="btn-base w-full py-2.5 rounded-md bg-[#e50914] hover:bg-[#c80812] font-semibold text-xs text-white transition-colors cursor-pointer gap-2"
            >
              <span>Continue to Pay</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onReleaseHold}
              className="btn-base w-full py-2 rounded-md bg-[#0f0f11] hover:bg-[#222227] border border-[#2a2a30] text-xs font-medium text-[#92929e] hover:text-[#f4f4f6] transition-colors cursor-pointer gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5 text-[#e50914]" />
              <span>Release Seats</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
