/**
 * Automatic 24-hour Rolling Shows Scheduler
 *
 * Runs show generation and safe past show cleanup:
 *  1. Once shortly after server starts up (background non-blocking).
 *  2. Recurring every 24 hours via setInterval.
 */

import { generateShows } from './generateShows.js';

let schedulerIntervalId = null;

export const startShowsScheduler = () => {
  if (schedulerIntervalId) return;

  // Run initial rolling sync 5 seconds after server start in background
  setTimeout(async () => {
    try {
      console.log('[Shows Scheduler] Running initial startup rolling shows check...');
      await generateShows();
    } catch (err) {
      console.error('[Shows Scheduler Error on startup]:', err.message);
    }
  }, 5000);

  // Run recurring sync every 24 hours
  schedulerIntervalId = setInterval(async () => {
    try {
      console.log('[Shows Scheduler] Running 24-hour rolling shows update & cleanup...');
      await generateShows();
    } catch (err) {
      console.error('[Shows Scheduler Error recurring]:', err.message);
    }
  }, 24 * 60 * 60 * 1000);

  console.log('[Shows Scheduler] Scheduled rolling shows update running every 24h');
};

export const stopShowsScheduler = () => {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
    schedulerIntervalId = null;
  }
};
