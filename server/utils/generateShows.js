/**
 * Rolling Shows Generator & Past Shows Cleanup
 *
 * Rules:
 *  - 3 slots/day (13:00, 17:00, 20:30) for next 5 days for top 8 cities.
 *  - 2 slots/day (13:00, 18:00) for next 5 days for 1-2 theatres in other cities.
 *  - Movie selection: Top 12-15 now_showing movies matched by language to each city (always including top Hindi & English).
 *  - Idempotent: checks for time overlap (duration + 15 min buffer); skips already scheduled slots.
 *  - Hard cap: total Seat documents must stay under 400,000.
 *  - Safe cleanup: removes past shows > 2 days old with 0 bookings along with their seats. Never touches shows with bookings.
 *
 * Usage:
 *   npm run seed:shows
 *   npm run seed:shows -- --dry-run
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Show from '../models/Show.js';
import Movie from '../models/Movie.js';
import Theatre from '../models/Theatre.js';
import Booking from '../models/Booking.js';
import Seat from '../models/Seat.js';
import { generateSeatsForShow } from '../services/bookingService.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const TOP_8_CITIES = new Set([
  'Mumbai',
  'Delhi NCR',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Pune',
  'Ahmedabad',
]);

const CITY_LANGUAGES = {
  'Mumbai':        ['Hindi', 'English', 'Marathi'],
  'Delhi NCR':     ['Hindi', 'English', 'Punjabi'],
  'Bengaluru':     ['Kannada', 'Hindi', 'English', 'Telugu', 'Tamil'],
  'Hyderabad':     ['Telugu', 'Hindi', 'English'],
  'Chennai':       ['Tamil', 'English', 'Hindi', 'Telugu'],
  'Kolkata':       ['Bengali', 'Hindi', 'English'],
  'Pune':          ['Hindi', 'Marathi', 'English'],
  'Ahmedabad':     ['Gujarati', 'Hindi', 'English'],
  'Jaipur':        ['Hindi', 'English'],
  'Lucknow':       ['Hindi', 'English'],
  'Chandigarh':    ['Punjabi', 'Hindi', 'English'],
  'Indore':        ['Hindi', 'English'],
  'Bhopal':        ['Hindi', 'English'],
  'Raipur':        ['Hindi', 'English'],
  'Nagpur':        ['Hindi', 'Marathi', 'English'],
  'Kochi':         ['Malayalam', 'Tamil', 'English', 'Hindi'],
  'Visakhapatnam': ['Telugu', 'Hindi', 'English'],
  'Surat':         ['Gujarati', 'Hindi', 'English'],
  'Patna':         ['Hindi', 'English'],
  'Bhubaneswar':   ['Odia', 'Hindi', 'English'],
};

// ── Calculate dynamic show price ──────────────────────────────────────────────
const calculatePrice = (format, showDate, slotHour) => {
  let basePrice = 200;
  if (format === '3D') basePrice = 280;
  else if (format === 'IMAX') basePrice = 450;
  else if (format === '4DX') basePrice = 520;

  // Matinee discount
  if (slotHour <= 14) {
    basePrice = Math.round((basePrice * 0.9) / 10) * 10;
  } else if (slotHour >= 19) {
    basePrice = Math.round((basePrice * 1.15) / 10) * 10;
  }

  // Weekend surcharge (Fri night / Sat / Sun)
  const day = showDate.getDay();
  if (day === 0 || day === 6) {
    basePrice = Math.round((basePrice * 1.2) / 10) * 10;
  }

  return basePrice;
};

// ── Select top 12-15 movies for a specific city ───────────────────────────────
const selectMoviesForCity = (city, allNowShowing) => {
  const preferredLangs = CITY_LANGUAGES[city] || ['Hindi', 'English'];

  // Always include top Hindi and English
  const topHindi = allNowShowing
    .filter((m) => m.languages?.some((l) => l.toLowerCase() === 'hindi'))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 4);

  const topEnglish = allNowShowing
    .filter((m) => m.languages?.some((l) => l.toLowerCase() === 'english'))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 4);

  // Regional matching movies
  const regional = allNowShowing
    .filter((m) =>
      m.languages?.some((l) =>
        preferredLangs.some((pref) => pref.toLowerCase() === l.toLowerCase() && pref !== 'Hindi' && pref !== 'English')
      )
    )
    .sort((a, b) => (b.rating || 0) - (a.rating || 0));

  // Combine and deduplicate
  const selectedMap = new Map();
  [...topHindi, ...topEnglish, ...regional].forEach((m) => {
    selectedMap.set(m._id.toString(), m);
  });

  // If under 12, backfill with highest rated remaining
  if (selectedMap.size < 12) {
    const remaining = [...allNowShowing]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .filter((m) => !selectedMap.has(m._id.toString()));

    for (const m of remaining) {
      selectedMap.set(m._id.toString(), m);
      if (selectedMap.size >= 15) break;
    }
  }

  return Array.from(selectedMap.values()).slice(0, 15);
};

// ── Safe cleanup of old shows with zero bookings ──────────────────────────────
export const cleanupPastShows = async () => {
  const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
  const expiredCandidateShows = await Show.find({ startTime: { $lt: cutoff } }).select('_id');

  if (expiredCandidateShows.length === 0) return 0;

  let deletedShowsCount = 0;
  let deletedSeatsCount = 0;

  for (const show of expiredCandidateShows) {
    const hasBookings = await Booking.exists({ show: show._id });
    if (!hasBookings) {
      const seatDeleteRes = await Seat.deleteMany({ show: show._id });
      await Show.deleteOne({ _id: show._id });
      deletedSeatsCount += seatDeleteRes.deletedCount || 0;
      deletedShowsCount++;
    }
  }

  if (deletedShowsCount > 0) {
    console.log(`[cleanupPastShows] Removed ${deletedShowsCount} empty past shows and ${deletedSeatsCount} associated seats.`);
  }
  return deletedShowsCount;
};

// ── Main Shows Generator ──────────────────────────────────────────────────────
export const generateShows = async (options = {}) => {
  const isDryRun = options.dryRun || process.argv.includes('--dry-run');

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri && mongoose.connection.readyState === 0) {
    throw new Error('MONGO_URI is not set in environment.');
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
    console.log('[generateShows] Connected to MongoDB:', mongoose.connection.name);
  }

  // 1. Run safe cleanup first
  if (!isDryRun) {
    await cleanupPastShows();
  }

  // 2. Fetch active now_showing movies
  const nowShowingMovies = await Movie.find({
    status: 'now_showing',
    isActive: true,
  });

  if (nowShowingMovies.length === 0) {
    console.warn('[generateShows] No active now_showing movies found in database.');
    return;
  }

  // 3. Fetch active theatres grouped by city
  const activeTheatres = await Theatre.find({ isActive: true });
  const cityTheatresMap = new Map();
  for (const t of activeTheatres) {
    if (!cityTheatresMap.has(t.city)) {
      cityTheatresMap.set(t.city, []);
    }
    cityTheatresMap.get(t.city).push(t);
  }

  // 4. Plan candidate shows
  const candidateShows = [];
  let projectedSeatsCount = 0;
  const now = new Date();

  for (const [city, theatres] of cityTheatresMap.entries()) {
    const isTop8 = TOP_8_CITIES.has(city);
    // Top 8 cities schedule up to 4 theatres; other cities schedule 1 theatre
    const selectedTheatres = isTop8 ? theatres.slice(0, 4) : theatres.slice(0, 1);

    // Slots: 3 slots for top 8 (13:00, 17:00, 20:30), 2 slots for others (13:00, 18:00)
    const slotTimes = isTop8
      ? [{ hour: 13, minute: 0 }, { hour: 17, minute: 0 }, { hour: 20, minute: 30 }]
      : [{ hour: 13, minute: 0 }, { hour: 18, minute: 0 }];

    const cityMovies = selectMoviesForCity(city, nowShowingMovies);
    let movieRotationIdx = 0;

    for (const theatre of selectedTheatres) {
      for (const screen of theatre.screens || []) {
        const screenSeats = (screen.rows || 10) * (screen.seatsPerRow || 15);

        // Next 5 days
        for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
          const targetDay = new Date(now);
          targetDay.setDate(targetDay.getDate() + dayOffset);

          for (const slot of slotTimes) {
            const start = new Date(targetDay);
            start.setHours(slot.hour, slot.minute, 0, 0);

            // Skip if in the past
            if (start <= now) continue;

            const selectedMovie = cityMovies[movieRotationIdx % cityMovies.length];
            movieRotationIdx++;

            const duration = selectedMovie.duration || 120;
            const end = new Date(start.getTime() + (duration + 15) * 60 * 1000);

            const format = screen.format || '2D';
            const price = calculatePrice(format, start, slot.hour);

            candidateShows.push({
              movie: selectedMovie._id,
              movieTitle: selectedMovie.title,
              theatre: theatre._id,
              theatreName: theatre.name,
              city,
              screenName: screen.name,
              screenSeats,
              language: selectedMovie.languages?.[0] || 'Hindi',
              startTime: start,
              endTime: end,
              price,
            });

            projectedSeatsCount += screenSeats;
          }
        }
      }
    }
  }

  // 5. Pre-check existing shows in bulk to accurately project new seat documents
  console.log(`[generateShows] Planning ${candidateShows.length} total potential show slots across ${cityTheatresMap.size} cities...`);

  const currentSeatCount = await Seat.countDocuments({});
  console.log(`[generateShows] Current Seat documents in DB: ${currentSeatCount}`);

  // Fetch existing shows across the 5-day window in a single query
  const maxEnd = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
  const existingShows = await Show.find({
    startTime: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), $lte: maxEnd },
  }).select('theatre screenName startTime endTime');

  const existingMap = new Map(); // "theatreId_screenName" -> Array of { start, end }
  for (const s of existingShows) {
    const key = `${s.theatre.toString()}_${s.screenName}`;
    if (!existingMap.has(key)) existingMap.set(key, []);
    existingMap.get(key).push({
      start: new Date(s.startTime).getTime(),
      end: new Date(s.endTime).getTime(),
    });
  }

  // Filter out slots that overlap
  const showsToCreate = [];
  let newSeatsProjected = 0;

  for (const candidate of candidateShows) {
    const key = `${candidate.theatre.toString()}_${candidate.screenName}`;
    const screenIntervals = existingMap.get(key) || [];
    const candStart = candidate.startTime.getTime();
    const candEnd = candidate.endTime.getTime();

    const hasOverlap = screenIntervals.some(
      (interval) => interval.start < candEnd && interval.end > candStart
    );

    if (!hasOverlap) {
      showsToCreate.push(candidate);
      newSeatsProjected += candidate.screenSeats;
      // Add to in-memory intervals so subsequent slots on same screen don't overlap
      screenIntervals.push({ start: candStart, end: candEnd });
      existingMap.set(key, screenIntervals);
    }
  }

  const projectedTotalSeats = currentSeatCount + newSeatsProjected;
  const HARD_CAP = 400000;

  console.log('───────────────────────────────────────────────────────');
  console.log('[generateShows] Schedule Projection:');
  console.log(`  • Planned Show Slots       : ${candidateShows.length}`);
  console.log(`  • New Shows to Schedule    : ${showsToCreate.length}`);
  console.log(`  • Skipped (already exist)  : ${candidateShows.length - showsToCreate.length}`);
  console.log(`  • Current Seats in DB      : ${currentSeatCount}`);
  console.log(`  • Projected New Seats      : ${newSeatsProjected}`);
  console.log(`  • Total Projected Seats    : ${projectedTotalSeats} / ${HARD_CAP} max cap`);
  console.log('───────────────────────────────────────────────────────');

  // Hard Cap Enforcement
  if (projectedTotalSeats > HARD_CAP) {
    console.error(`[generateShows] ABORTED: Total projected seats (${projectedTotalSeats}) exceeds hard cap of ${HARD_CAP}!`);
    return { aborted: true, reason: 'Exceeded 400,000 seat hard cap' };
  }

  if (isDryRun) {
    console.log('[generateShows] DRY RUN MODE: No shows or seats were created.');
    return { dryRun: true, plannedShows: showsToCreate.length, projectedTotalSeats };
  }

  // 6. Execute show and seat generation in batches of 20 with pauses
  let createdCount = 0;
  const BATCH_SIZE = 20;

  for (let i = 0; i < showsToCreate.length; i += BATCH_SIZE) {
    const batch = showsToCreate.slice(i, i + BATCH_SIZE);

    for (const item of batch) {
      try {
        const show = await Show.create({
          movie: item.movie,
          theatre: item.theatre,
          screenName: item.screenName,
          language: item.language,
          startTime: item.startTime,
          endTime: item.endTime,
          price: item.price,
        });

        // Generate Seat documents using exact bookingService logic
        await generateSeatsForShow(show);
        createdCount++;
      } catch (err) {
        console.warn(`[generateShows] Error creating show at ${item.theatreName} (${item.screenName}):`, err.message);
      }
    }

    if (i + BATCH_SIZE < showsToCreate.length) {
      await sleep(80); // Prevent Atlas write throttling
    }
  }

  const finalSeatCount = await Seat.countDocuments({});
  const finalShowCount = await Show.countDocuments({ startTime: { $gte: now } });

  console.log('───────────────────────────────────────────────────────');
  console.log('[generateShows] Execution Finished Successfully:');
  console.log(`  • Shows Created            : ${createdCount}`);
  console.log(`  • Total Upcoming Shows     : ${finalShowCount}`);
  console.log(`  • Final Seat Documents     : ${finalSeatCount} (Safe under 400k)`);
  console.log('───────────────────────────────────────────────────────');

  return { createdCount, finalSeatCount };
};

// Direct invocation check
const isDirectRun = process.argv[1] && process.argv[1].endsWith('generateShows.js');
if (isDirectRun) {
  generateShows()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[generateShows] Fatal error:', err);
      process.exit(1);
    });
}
