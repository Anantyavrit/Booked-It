import { releaseExpiredHolds } from '../services/bookingService.js';

let intervalId = null;

/**
 * startHoldCleanup()
 * Runs every 60 seconds to clean up expired seat holds and pending bookings.
 * Wrapped in try/catch to ensure the process never crashes.
 */
export const startHoldCleanup = () => {
  if (intervalId) return;

  intervalId = setInterval(async () => {
    try {
      const affectedShows = await releaseExpiredHolds();
      if (affectedShows && affectedShows.length > 0) {
        // Expired holds released
      }
    } catch (err) {
      console.error('[Hold Cleanup Error]:', err.message);
    }
  }, 60 * 1000);

  console.log('[Hold Cleanup] Scheduled interval running every 60s');
};

export const stopHoldCleanup = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};
