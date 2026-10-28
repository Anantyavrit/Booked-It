/**
 * Seed / Sync Movies from TMDB API (or fallback to local server/data/movies.json)
 *
 * Usage:
 *   npm run seed:movies
 *
 * Environment variables:
 *   MONGO_URI      MongoDB connection string
 *   TMDB_API_KEY   Optional TMDB API Key (v3 hex key or v4 bearer token)
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Movie from '../models/Movie.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const LANGUAGE_NAMES = {
  hi: 'Hindi',
  en: 'English',
  te: 'Telugu',
  ta: 'Tamil',
  ml: 'Malayalam',
  kn: 'Kannada',
  bn: 'Bengali',
  mr: 'Marathi',
  pa: 'Punjabi',
};

// ── TMDB API Helper ───────────────────────────────────────────────────────────
const tmdbFetch = async (endpoint, apiKey, queryParams = {}) => {
  const isBearer = apiKey.length > 50 || apiKey.startsWith('eyJ');
  const url = new URL(`https://api.themoviedb.org/3${endpoint}`);

  Object.entries(queryParams).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      url.searchParams.set(k, String(v));
    }
  });

  const headers = {
    Accept: 'application/json',
  };

  if (isBearer) {
    headers.Authorization = `Bearer ${apiKey}`;
  } else {
    url.searchParams.set('api_key', apiKey);
  }

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    throw new Error(`TMDB HTTP ${res.status}: ${res.statusText} for ${url.pathname}`);
  }
  return res.json();
};

// ── Backfill Existing Legacy Movies ───────────────────────────────────────────
const backfillLegacyMovies = async () => {
  const result = await Movie.updateMany(
    {
      $or: [
        { status: { $exists: false } },
        { status: null },
        { formats: { $exists: false } },
      ],
    },
    {
      $set: {
        status: 'now_showing',
        formats: ['2D'],
        backdrop: '',
        tagline: '',
        director: '',
      },
    }
  );
  return result.modifiedCount || 0;
};

// ── Build Movie Document from TMDB Details ────────────────────────────────────
const mapTmdbToMovie = (details, forceStatus = null) => {
  if (!details.poster_path || !details.overview?.trim()) {
    return null;
  }

  const title = (details.title || details.original_title || '').trim();
  if (!title) return null;

  // Director
  const director =
    details.credits?.crew?.find((c) => c.job === 'Director')?.name?.trim() || '';

  // Cast: top 5 billed
  const cast = (details.credits?.cast || [])
    .slice(0, 5)
    .map((c) => c.name?.trim())
    .filter(Boolean);

  // Trailer URL from YouTube
  let trailerUrl = '';
  const videos = details.videos?.results || [];
  const trailer =
    videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
    videos.find((v) => v.site === 'YouTube' && (v.type === 'Teaser' || v.type === 'Clip'));
  if (trailer?.key) {
    trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
  }

  // Runtime / Duration: clamp between 30 and 300 minutes
  const runtime = Number(details.runtime);
  const duration = Math.min(300, Math.max(30, !isNaN(runtime) && runtime > 0 ? runtime : 120));

  // Certificate: default to 'UA', map adult=true to 'A', check Indian certification if present
  let certificate = details.adult ? 'A' : 'UA';
  const inReleases = details.release_dates?.results?.find((r) => r.iso_3166_1 === 'IN');
  if (inReleases?.release_dates) {
    for (const rd of inReleases.release_dates) {
      const c = rd.certification?.toUpperCase().trim();
      if (['U', 'UA', 'A'].includes(c)) {
        certificate = c;
        break;
      }
    }
  }

  // Genres
  const genres = (details.genres || []).map((g) => g.name).filter(Boolean);
  if (genres.length === 0) genres.push('Drama');

  // Languages
  const origLang = details.original_language || 'en';
  const langName = LANGUAGE_NAMES[origLang] || 'English';
  const languages = [langName];

  // Status: coming_soon or now_showing
  let status = forceStatus;
  if (!status) {
    const relDate = details.release_date ? new Date(details.release_date) : null;
    if (relDate && relDate > new Date()) {
      status = 'coming_soon';
    } else {
      status = 'now_showing';
    }
  }

  // Formats
  const formats = ['2D'];
  if (genres.includes('Action') || genres.includes('Sci-Fi')) {
    formats.push('IMAX');
  }

  // Rating
  const voteAvg = Number(details.vote_average);
  const rating = !isNaN(voteAvg) && voteAvg > 0 ? Math.round(voteAvg * 10) / 10 : null;

  return {
    tmdbId: details.id,
    title,
    description: details.overview.trim(),
    poster: `https://image.tmdb.org/t/p/w500${details.poster_path}`,
    backdrop: details.backdrop_path ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}` : '',
    tagline: (details.tagline || '').trim(),
    director,
    cast,
    trailerUrl,
    duration,
    certificate,
    genres,
    languages,
    status,
    formats,
    rating,
    releaseDate: details.release_date ? new Date(details.release_date) : new Date(),
    isActive: true,
  };
};

// ── Fetch Catalog from TMDB API ───────────────────────────────────────────────
const fetchMoviesFromTmdb = async (apiKey) => {
  console.log('[seedMovies] Fetching current catalogue from TMDB API...');

  const plannedTargets = [
    { lang: 'hi', label: 'Hindi', count: 12 },
    { lang: 'en', label: 'English', count: 8 },
    { lang: 'te', label: 'Telugu', count: 6 },
    { lang: 'ta', label: 'Tamil', count: 5 },
    { lang: 'ml', label: 'Malayalam', count: 3 },
    { lang: 'kn', label: 'Kannada', count: 3 },
  ];

  const candidateMap = new Map(); // tmdbId -> { forceStatus: 'coming_soon' | null }

  // 1. Upcoming in India (target >= 6 coming soon)
  try {
    const upcomingRes = await tmdbFetch('/movie/upcoming', apiKey, { region: 'IN', page: 1 });
    for (const item of (upcomingRes.results || []).slice(0, 8)) {
      candidateMap.set(item.id, { forceStatus: 'coming_soon' });
    }
  } catch (err) {
    console.warn('[seedMovies] Warning fetching upcoming:', err.message);
  }
  await sleep(150);

  // 2. Now playing in India
  try {
    const nowPlayingRes = await tmdbFetch('/movie/now_playing', apiKey, { region: 'IN', page: 1 });
    for (const item of (nowPlayingRes.results || []).slice(0, 10)) {
      if (!candidateMap.has(item.id)) {
        candidateMap.set(item.id, { forceStatus: 'now_showing' });
      }
    }
  } catch (err) {
    console.warn('[seedMovies] Warning fetching now_playing:', err.message);
  }
  await sleep(150);

  // 3. Discover by languages
  for (const target of plannedTargets) {
    try {
      const res = await tmdbFetch('/discover/movie', apiKey, {
        with_original_language: target.lang,
        sort_by: 'popularity.desc',
        page: 1,
      });

      let added = 0;
      for (const item of res.results || []) {
        if (!candidateMap.has(item.id)) {
          candidateMap.set(item.id, { forceStatus: null });
          added++;
          if (added >= target.count) break;
        }
      }
    } catch (err) {
      console.warn(`[seedMovies] Warning discovering ${target.label}:`, err.message);
    }
    await sleep(150);
  }

  console.log(`[seedMovies] Collected ${candidateMap.size} unique candidate movies. Fetching full details...`);

  const mappedMovies = [];
  let skipped = 0;

  for (const [id, meta] of candidateMap.entries()) {
    try {
      await sleep(120); // Stay within TMDB rate limits
      const details = await tmdbFetch(`/movie/${id}`, apiKey, {
        append_to_response: 'credits,videos,release_dates',
      });
      const movieDoc = mapTmdbToMovie(details, meta.forceStatus);
      if (movieDoc) {
        mappedMovies.push(movieDoc);
      } else {
        skipped++;
      }
    } catch (err) {
      console.warn(`[seedMovies] Skipped movie ID ${id}: ${err.message}`);
      skipped++;
    }
  }

  return { movies: mappedMovies, skippedCount: skipped };
};

// ── Fallback: Load from local JSON ────────────────────────────────────────────
const loadFallbackMovies = () => {
  const filePath = path.join(__dirname, '../data/movies.json');
  console.log(`[seedMovies] TMDB_API_KEY absent. Loading local catalog from ${filePath}...`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Fallback file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);
  return data.map((m) => ({
    ...m,
    releaseDate: m.releaseDate ? new Date(m.releaseDate) : new Date(),
  }));
};

// ── Main Seeder Execution ─────────────────────────────────────────────────────
export const seedMovies = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is not set in environment.');
  }

  const apiKey = (process.env.TMDB_API_KEY || '').trim();

  await mongoose.connect(mongoUri);
  console.log('[seedMovies] Connected to MongoDB:', mongoose.connection.name);

  // 1. Backfill legacy 5 movies
  const backfilledCount = await backfillLegacyMovies();
  console.log(`[seedMovies] Backfilled ${backfilledCount} legacy movie(s) with new default fields.`);

  // 2. Fetch movies (TMDB or local fallback)
  let moviesToUpsert = [];
  let skippedCount = 0;

  if (apiKey) {
    const res = await fetchMoviesFromTmdb(apiKey);
    moviesToUpsert = res.movies;
    skippedCount = res.skippedCount;
  } else {
    console.log('[seedMovies] Note: TMDB_API_KEY not found in environment.');
    moviesToUpsert = loadFallbackMovies();
  }

  if (moviesToUpsert.length === 0) {
    console.log('[seedMovies] No movies to upsert.');
    await mongoose.disconnect();
    return;
  }

  // 3. Upsert into database by tmdbId
  const ops = moviesToUpsert.map((movie) => ({
    updateOne: {
      filter: { tmdbId: movie.tmdbId },
      update: { $set: movie },
      upsert: true,
    },
  }));

  const bulkResult = await Movie.bulkWrite(ops);
  const insertedCount = bulkResult.upsertedCount || 0;
  const updatedCount = bulkResult.modifiedCount || 0;

  const totalInDb = await Movie.countDocuments({ isActive: true });
  const nowShowingCount = await Movie.countDocuments({ status: 'now_showing', isActive: true });
  const comingSoonCount = await Movie.countDocuments({ status: 'coming_soon', isActive: true });

  console.log('───────────────────────────────────────────────────────');
  console.log('[seedMovies] Seeding Summary:');
  console.log(`  • Inserted (new)       : ${insertedCount}`);
  console.log(`  • Updated (existing)   : ${updatedCount}`);
  console.log(`  • Skipped (no poster)  : ${skippedCount}`);
  console.log(`  • Backfilled legacy    : ${backfilledCount}`);
  console.log(`  • Total Active Movies  : ${totalInDb}`);
  console.log(`    - Now Showing        : ${nowShowingCount}`);
  console.log(`    - Coming Soon        : ${comingSoonCount}`);
  console.log('───────────────────────────────────────────────────────');

  await mongoose.disconnect();
  console.log('[seedMovies] Disconnected from MongoDB. Done.');
};

// Run if called directly
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isDirectRun) {
  seedMovies()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seedMovies] Error:', err);
      process.exit(1);
    });
}
