/**
 * Seed Sample Data — safe to re-run.
 *
 * Creates: 5 movies, 2 theatres (2 screens each), ~10 shows over next 5 days.
 * Skips movies/theatres if any already exist (never touches users).
 *
 * Run with:  npm run seed:sample
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Movie from '../models/Movie.js';
import Theatre from '../models/Theatre.js';
import Show from '../models/Show.js';

// ── Sample data ───────────────────────────────────────────────────────────────

const MOVIES = [
  {
    title: 'The Dark Knight',
    description: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
    genres: ['Action', 'Crime', 'Drama'],
    languages: ['English', 'Hindi'],
    duration: 152,
    certificate: 'UA',
    cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart'],
    poster: 'https://upload.wikimedia.org/wikipedia/en/1/1c/The_Dark_Knight_%282008_film%29.jpg',
    releaseDate: new Date('2008-07-18'),
  },
  {
    title: 'Interstellar',
    description: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
    genres: ['Adventure', 'Drama', 'Sci-Fi'],
    languages: ['English', 'Hindi'],
    duration: 169,
    certificate: 'UA',
    cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain'],
    poster: 'https://upload.wikimedia.org/wikipedia/en/b/bc/Interstellar_film_poster.jpg',
    releaseDate: new Date('2014-11-07'),
  },
  {
    title: 'Inception',
    description: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
    genres: ['Action', 'Adventure', 'Sci-Fi'],
    languages: ['English', 'Hindi', 'Tamil'],
    duration: 148,
    certificate: 'UA',
    cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page'],
    poster: 'https://upload.wikimedia.org/wikipedia/en/2/2e/Inception_%282010%29_theatrical_poster.jpg',
    releaseDate: new Date('2010-07-16'),
  },
  {
    title: 'Avengers: Endgame',
    description: 'After the devastating events of Infinity War, the Avengers assemble once more to reverse Thanos\'s actions and restore balance to the universe.',
    genres: ['Action', 'Adventure', 'Drama'],
    languages: ['English', 'Hindi', 'Tamil', 'Telugu'],
    duration: 181,
    certificate: 'UA',
    cast: ['Robert Downey Jr.', 'Chris Evans', 'Mark Ruffalo'],
    poster: 'https://upload.wikimedia.org/wikipedia/en/0/0d/Avengers_Endgame_poster.jpg',
    releaseDate: new Date('2019-04-26'),
  },
  {
    title: 'Dune: Part Two',
    description: 'Paul Atreides unites with the Fremen while on a warpath of revenge against the conspirators who destroyed his family.',
    genres: ['Action', 'Adventure', 'Drama'],
    languages: ['English', 'Hindi'],
    duration: 166,
    certificate: 'UA',
    cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson'],
    poster: 'https://upload.wikimedia.org/wikipedia/en/5/52/Dune_Part_Two_poster.jpeg',
    releaseDate: new Date('2024-03-01'),
  },
];

const THEATRES = [
  {
    name: 'PVR Cinemas',
    city: 'Mumbai',
    address: 'Lower Parel, Phoenix Mills Compound, Mumbai 400013',
    screens: [
      { name: 'Screen 1', rows: 10, seatsPerRow: 20 },
      { name: 'Screen 2', rows: 8,  seatsPerRow: 15 },
    ],
  },
  {
    name: 'INOX Theatres',
    city: 'Bangalore',
    address: 'Forum Mall, Koramangala, Bangalore 560095',
    screens: [
      { name: 'Screen A', rows: 12, seatsPerRow: 25 },
      { name: 'Screen B', rows: 6,  seatsPerRow: 10 },
    ],
  },
];

// Helper: get date N days from now at a specific hour (local midnight base)
const futureDate = (daysFromNow, hour, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    // ── Skip if data already exists ─────────────────────────────────────────
    const [movieCount, theatreCount] = await Promise.all([
      Movie.countDocuments(),
      Theatre.countDocuments(),
    ]);

    if (movieCount > 0 || theatreCount > 0) {
      console.log(`Skipping seed: ${movieCount} movies and ${theatreCount} theatres already exist.`);
      await mongoose.disconnect();
      return;
    }

    // ── Insert movies ────────────────────────────────────────────────────────
    const movies = await Movie.insertMany(MOVIES);
    console.log(`Inserted ${movies.length} movies`);

    // ── Insert theatres ──────────────────────────────────────────────────────
    const theatres = await Theatre.insertMany(THEATRES);
    console.log(`Inserted ${theatres.length} theatres`);

    // Shorthand refs
    const [pvr, inox] = theatres;
    const [darkKnight, interstellar, inception, endgame, dune] = movies;

    // Helper: build a show object and calculate endTime from movie duration
    const makeShow = (movie, theatre, screenName, language, daysFromNow, hour, price) => {
      const start = futureDate(daysFromNow, hour);
      const end   = new Date(start.getTime() + (movie.duration + 15) * 60 * 1000);
      return { movie: movie._id, theatre: theatre._id, screenName, language, startTime: start, endTime: end, price };
    };

    // ── 10 shows — no overlaps on same screen ────────────────────────────────
    // PVR Screen 1: Day1@10:00 (152min), Day1@14:00 (169min), Day4@18:00 (181min)
    // PVR Screen 2: Day1@10:00 (148min), Day3@15:00 (169min)
    // INOX Screen A: Day1@11:00 (181min), Day2@10:00 (152min), Day4@19:00 (166min)
    // INOX Screen B: Day2@10:00 (166min), Day3@12:00 (148min)

    const showDocs = [
      makeShow(darkKnight,  pvr,  'Screen 1', 'Hindi',   1, 10, 250),
      makeShow(interstellar,pvr,  'Screen 1', 'English', 1, 14, 280),
      makeShow(endgame,     pvr,  'Screen 1', 'Hindi',   4, 18, 300),
      makeShow(inception,   pvr,  'Screen 2', 'English', 1, 10, 230),
      makeShow(interstellar,pvr,  'Screen 2', 'Hindi',   3, 15, 260),
      makeShow(endgame,     inox, 'Screen A', 'Hindi',   1, 11, 320),
      makeShow(darkKnight,  inox, 'Screen A', 'English', 2, 10, 270),
      makeShow(dune,        inox, 'Screen A', 'English', 4, 19, 310),
      makeShow(dune,        inox, 'Screen B', 'Hindi',   2, 10, 200),
      makeShow(inception,   inox, 'Screen B', 'English', 3, 12, 210),
    ];

    const shows = await Show.insertMany(showDocs);
    console.log(`Inserted ${shows.length} shows`);
    console.log('Sample data seed complete!');
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }

  await mongoose.disconnect();
  process.exit(0);
};

seed();
