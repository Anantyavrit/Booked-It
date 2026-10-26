import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Ticket } from 'lucide-react';
import { movieApi } from '../api/movieApi.js';
import { useFetch } from '../hooks/useFetch.js';
import MovieGrid from '../components/MovieGrid.jsx';
import ErrorState from '../components/ErrorState.jsx';

export default function Home() {
  useEffect(() => {
    document.title = 'IMovies — Next-Gen Movie Ticket Booking';
  }, []);

  const { data, loading, error, refetch } = useFetch(
    () => movieApi.getMovies({ limit: 10, sort: 'newest' }),
    []
  );

  const movies = data?.data || [];

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden border border-neutral-800 bg-gradient-to-b from-neutral-900/80 via-neutral-900/40 to-neutral-950 p-8 sm:p-14 text-center flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-900/20 via-transparent to-transparent pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Cinematic Experiences, Reserved in Seconds</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
          Book Blockbusters, Choose Your Favorite Seats
        </h1>
        <p className="mt-4 text-sm sm:text-base text-neutral-400 max-w-xl">
          Live seat layouts, secure transactions, and zero booking friction across leading cinemas in your city.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/movies"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 font-semibold text-white shadow-lg shadow-rose-950/40 transition-all hover:scale-105"
          >
            <span>Explore Movies</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Feature Badges */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl text-left">
          <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 flex items-start gap-3">
            <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-neutral-200">Instant Seat Holds</div>
              <div className="text-[11px] text-neutral-400 mt-0.5">5-minute lock while you pay</div>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-neutral-200">Verified Razorpay</div>
              <div className="text-[11px] text-neutral-400 mt-0.5">Cryptographic signature check</div>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 flex items-start gap-3">
            <Ticket className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-neutral-200">Instant E-Ticket</div>
              <div className="text-[11px] text-neutral-400 mt-0.5">Mobile-first show confirmation</div>
            </div>
          </div>
        </div>
      </section>

      {/* Now Showing Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Now Showing</h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">Trending movies in cinemas right now</p>
          </div>
          <Link
            to="/movies"
            className="text-xs sm:text-sm font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <MovieGrid movies={movies} loading={loading} skeletonCount={5} />
        )}
      </section>
    </div>
  );
}
