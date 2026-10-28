import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  MapPin,
  Star,
  Film,
} from 'lucide-react';
import { movieApi } from '../api/movieApi.js';
import { useFetch } from '../hooks/useFetch.js';
import { useCity } from '../context/CityContext.jsx';
import MovieCard from '../components/MovieCard.jsx';
import MovieCardSkeleton from '../components/MovieCardSkeleton.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { formatDuration } from '../utils/format.js';

const BROWSE_LANGUAGES = [
  { name: 'Hindi', script: 'हिन्दी' },
  { name: 'English', script: 'English' },
  { name: 'Telugu', script: 'తెలుగు' },
  { name: 'Tamil', script: 'தமிழ்' },
  { name: 'Malayalam', script: 'മലയാളം' },
  { name: 'Kannada', script: 'ಕನ್ನಡ' },
  { name: 'Bengali', script: 'বাংলা' },
  { name: 'Marathi', script: 'मराठी' },
];

export default function Home() {
  const { selectedCity, setSelectedCity } = useCity();

  useEffect(() => {
    document.title = 'IMovies — Book Tickets at Leading Theatres';
  }, []);

  // 1. Fetch Now Showing movies (matching selected city)
  const {
    data: nowShowingData,
    loading: nowShowingLoading,
    error: nowShowingError,
    refetch: refetchNowShowing,
  } = useFetch(
    () =>
      movieApi.getMovies({
        status: 'now_showing',
        city: selectedCity || undefined,
        hasShows: 'true',
        limit: 20,
        sort: 'rating',
      }),
    [selectedCity]
  );

  // 2. Fetch Coming Soon movies
  const {
    data: comingSoonData,
    loading: comingSoonLoading,
  } = useFetch(
    () =>
      movieApi.getMovies({
        status: 'coming_soon',
        limit: 12,
        sort: 'newest',
      }),
    []
  );

  const nowShowingMovies = useMemo(() => nowShowingData?.data || [], [nowShowingData]);
  const comingSoonMovies = useMemo(() => comingSoonData?.data || [], [comingSoonData]);

  // Top 4-5 featured movies with backdrops for the Hero Carousel
  const featuredMovies = useMemo(() => {
    if (nowShowingMovies.length === 0) return [];
    const withBackdrops = nowShowingMovies.filter((m) => Boolean(m.backdrop));
    if (withBackdrops.length >= 4) return withBackdrops.slice(0, 5);
    return nowShowingMovies.slice(0, 5);
  }, [nowShowingMovies]);

  // Hero carousel state
  const [heroIndex, setHeroIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-advance hero carousel every 5.5s
  useEffect(() => {
    if (featuredMovies.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % featuredMovies.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [featuredMovies.length, isHovered]);

  const activeHeroMovie = featuredMovies[heroIndex] || null;

  // Language filter chips for Now Showing row
  const availableLanguages = useMemo(() => {
    const set = new Set();
    nowShowingMovies.forEach((m) => {
      if (m.language) set.add(m.language);
    });
    return Array.from(set);
  }, [nowShowingMovies]);

  const [selectedLanguage, setSelectedLanguage] = useState('All');

  // Filtered now showing movies by chip
  const filteredNowShowing = useMemo(() => {
    if (selectedLanguage === 'All') return nowShowingMovies;
    return nowShowingMovies.filter(
      (m) => m.language && m.language.toLowerCase() === selectedLanguage.toLowerCase()
    );
  }, [nowShowingMovies, selectedLanguage]);

  // Horizontal scroll refs & handlers
  const nowShowingScrollRef = useRef(null);
  const comingSoonScrollRef = useRef(null);
  const languageScrollRef = useRef(null);

  const scrollContainer = (ref, offset) => {
    if (ref.current) {
      ref.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-12 sm:space-y-16 py-4 sm:py-6">
      {/* 1. Hero Carousel (4-5 Featured Movies with Backdrops) */}
      {activeHeroMovie ? (
        <section
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative rounded-xl overflow-hidden bg-[#18181c] border border-[#2a2a30] min-h-[380px] sm:min-h-[460px] md:min-h-[520px] flex items-end"
        >
          {/* Backdrop Image */}
          <div className="absolute inset-0">
            <img
              src={activeHeroMovie.backdrop || activeHeroMovie.poster}
              alt=""
              className="w-full h-full object-cover object-center transition-all duration-700 ease-out"
            />
            {/* Disciplined cinema vignetting: solid dark floor and left fade */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f11] via-[#0f0f11]/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0f0f11] via-[#0f0f11]/60 to-transparent" />
          </div>

          {/* Carousel Slide Content */}
          <div className="relative z-10 p-6 sm:p-10 md:p-12 max-w-3xl flex flex-col items-start gap-3 sm:gap-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0f0f11]/80 border border-[#2a2a30] text-[11px] font-semibold text-[#f4f4f6]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e50914]" />
              <span>NOW SHOWING {selectedCity ? `IN ${selectedCity.toUpperCase()}` : ''}</span>
            </div>

            <h1 className="font-['Outfit'] text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#f4f4f6] leading-tight">
              {activeHeroMovie.title}
            </h1>

            {/* Movie Metadata */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-[#92929e]">
              {activeHeroMovie.rating ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/70 border border-black/40 text-amber-400 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 stroke-none" />
                  <span>{Number(activeHeroMovie.rating).toFixed(1)}</span>
                </span>
              ) : null}

              {activeHeroMovie.certificate && (
                <span className="px-1.5 py-0.5 rounded bg-black/70 border border-white/10 font-mono text-[11px] font-semibold text-[#f4f4f6]">
                  {activeHeroMovie.certificate}
                </span>
              )}

              {activeHeroMovie.language && (
                <span className="font-medium text-[#f4f4f6]">
                  {activeHeroMovie.language}
                </span>
              )}

              {activeHeroMovie.duration ? (
                <>
                  <span>•</span>
                  <span>{formatDuration(activeHeroMovie.duration)}</span>
                </>
              ) : null}

              {activeHeroMovie.genres?.length > 0 && (
                <>
                  <span>•</span>
                  <span>{activeHeroMovie.genres.slice(0, 3).join(', ')}</span>
                </>
              )}

              {activeHeroMovie.formats?.length > 0 && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    {activeHeroMovie.formats.map((fmt) => (
                      <span
                        key={fmt}
                        className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-[10px] font-semibold text-[#f4f4f6]"
                      >
                        {fmt}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Description clamp */}
            {activeHeroMovie.description && (
              <p className="text-xs sm:text-sm text-[#92929e] line-clamp-2 max-w-xl">
                {activeHeroMovie.description}
              </p>
            )}

            {/* ONE Primary Button */}
            <div className="pt-2">
              <Link
                to={`/movies/${activeHeroMovie._id}`}
                className="btn-base px-6 py-2.5 rounded-md bg-[#e50914] hover:bg-[#c80812] font-semibold text-sm text-white transition-colors"
              >
                Book tickets
              </Link>
            </div>
          </div>

          {/* Carousel Arrow Controls & Indicators */}
          {featuredMovies.length > 1 && (
            <div className="absolute right-4 bottom-4 sm:right-8 sm:bottom-8 z-20 flex items-center gap-2">
              <div className="flex items-center gap-1.5 mr-2">
                {featuredMovies.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setHeroIndex(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === heroIndex
                        ? 'w-6 bg-[#e50914]'
                        : 'w-1.5 bg-[#2a2a30] hover:bg-[#92929e]'
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setHeroIndex(
                    (prev) => (prev - 1 + featuredMovies.length) % featuredMovies.length
                  )
                }
                className="p-2 rounded-md bg-[#0f0f11]/80 hover:bg-[#18181c] border border-[#2a2a30] text-[#f4f4f6] transition-colors cursor-pointer"
                aria-label="Previous featured movie"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() =>
                  setHeroIndex((prev) => (prev + 1) % featuredMovies.length)
                }
                className="p-2 rounded-md bg-[#0f0f11]/80 hover:bg-[#18181c] border border-[#2a2a30] text-[#f4f4f6] transition-colors cursor-pointer"
                aria-label="Next featured movie"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>
      ) : nowShowingLoading ? (
        <div className="h-96 w-full rounded-xl bg-[#18181c] border border-[#2a2a30] animate-pulse" />
      ) : null}

      {/* 2. Now Showing Section (Horizontal Scroll Row with Language Chips) */}
      <section className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-['Outfit'] text-xl sm:text-2xl font-bold tracking-tight text-[#f4f4f6]">
                Now Showing
              </h2>
              {selectedCity && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#18181c] text-xs font-medium text-[#92929e] border border-[#2a2a30]">
                  <MapPin className="w-3 h-3 text-[#e50914]" />
                  {selectedCity}
                </span>
              )}
            </div>
            <p className="text-xs text-[#92929e] mt-0.5">
              {selectedCity
                ? `Screenings with active showtimes in ${selectedCity}`
                : 'Browse current cinematic releases'}
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <Link
              to="/movies"
              className="text-xs font-semibold text-[#f4f4f6] hover:text-[#e50914] flex items-center gap-1 transition-colors"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* Desktop scroll navigation buttons */}
            <div className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                onClick={() => scrollContainer(nowShowingScrollRef, -480)}
                className="p-1.5 rounded-md bg-[#18181c] hover:bg-[#222227] border border-[#2a2a30] text-[#92929e] hover:text-[#f4f4f6] transition-colors"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollContainer(nowShowingScrollRef, 480)}
                className="p-1.5 rounded-md bg-[#18181c] hover:bg-[#222227] border border-[#2a2a30] text-[#92929e] hover:text-[#f4f4f6] transition-colors"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Language Filter Chips */}
        {availableLanguages.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              type="button"
              onClick={() => setSelectedLanguage('All')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                selectedLanguage === 'All'
                  ? 'bg-[#f4f4f6] text-[#0f0f11]'
                  : 'bg-[#18181c] text-[#92929e] hover:text-[#f4f4f6] border border-[#2a2a30] hover:bg-[#222227]'
              }`}
            >
              All Languages
            </button>

            {availableLanguages.map((lang) => {
              const isSelected = selectedLanguage.toLowerCase() === lang.toLowerCase();
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSelectedLanguage(lang)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-[#e50914] text-white font-semibold'
                      : 'bg-[#18181c] text-[#92929e] hover:text-[#f4f4f6] border border-[#2a2a30] hover:bg-[#222227]'
                  }`}
                >
                  {lang}
                </button>
              );
            })}
          </div>
        )}

        {/* Horizontal Scroll Row */}
        {nowShowingError ? (
          <ErrorState message={nowShowingError} onRetry={refetchNowShowing} />
        ) : nowShowingLoading ? (
          <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-36 sm:w-44 md:w-48 shrink-0">
                <MovieCardSkeleton />
              </div>
            ))}
          </div>
        ) : filteredNowShowing.length === 0 ? (
          <div className="p-8 text-center bg-[#18181c] border border-[#2a2a30] rounded-lg space-y-3">
            <p className="text-xs sm:text-sm text-[#92929e]">
              No now-showing movies in {selectedLanguage}
              {selectedCity ? ` for ${selectedCity}` : ''}.
            </p>
            {selectedLanguage !== 'All' ? (
              <button
                type="button"
                onClick={() => setSelectedLanguage('All')}
                className="px-3.5 py-1.5 rounded bg-[#222227] hover:bg-[#2a2a30] text-xs font-semibold text-[#f4f4f6] transition-colors"
              >
                Reset language filter
              </button>
            ) : selectedCity ? (
              <button
                type="button"
                onClick={() => setSelectedCity('')}
                className="px-3.5 py-1.5 rounded bg-[#e50914] hover:bg-[#c80812] text-xs font-semibold text-white transition-colors"
              >
                View all cities
              </button>
            ) : null}
          </div>
        ) : (
          <div
            ref={nowShowingScrollRef}
            className="flex gap-4 sm:gap-5 overflow-x-auto no-scrollbar scroll-smooth py-1"
          >
            {filteredNowShowing.map((movie) => (
              <div key={movie._id} className="w-36 sm:w-44 md:w-48 shrink-0">
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Coming Soon Section (Horizontal Scroll Row) */}
      {comingSoonMovies.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-[#2a2a30]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-['Outfit'] text-xl sm:text-2xl font-bold tracking-tight text-[#f4f4f6]">
                Coming Soon
              </h2>
              <p className="text-xs text-[#92929e] mt-0.5">
                Upcoming cinema blockbusters releasing soon
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/movies?status=coming_soon"
                className="text-xs font-semibold text-[#f4f4f6] hover:text-[#e50914] flex items-center gap-1 transition-colors"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              {/* Desktop scroll navigation buttons */}
              <div className="hidden sm:flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollContainer(comingSoonScrollRef, -480)}
                  className="p-1.5 rounded-md bg-[#18181c] hover:bg-[#222227] border border-[#2a2a30] text-[#92929e] hover:text-[#f4f4f6] transition-colors"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollContainer(comingSoonScrollRef, 480)}
                  className="p-1.5 rounded-md bg-[#18181c] hover:bg-[#222227] border border-[#2a2a30] text-[#92929e] hover:text-[#f4f4f6] transition-colors"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {comingSoonLoading ? (
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-36 sm:w-44 md:w-48 shrink-0">
                  <MovieCardSkeleton />
                </div>
              ))}
            </div>
          ) : (
            <div
              ref={comingSoonScrollRef}
              className="flex gap-4 sm:gap-5 overflow-x-auto no-scrollbar scroll-smooth py-1"
            >
              {comingSoonMovies.map((movie) => (
                <div key={movie._id} className="w-36 sm:w-44 md:w-48 shrink-0">
                  <MovieCard movie={movie} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. Browse by Language Row */}
      <section className="space-y-4 pt-4 border-t border-[#2a2a30]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-['Outfit'] text-xl sm:text-2xl font-bold tracking-tight text-[#f4f4f6]">
              Browse by Language
            </h2>
            <p className="text-xs text-[#92929e] mt-0.5">
              Explore cinema catalog curated in your preferred language
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollContainer(languageScrollRef, -320)}
              className="p-1.5 rounded-md bg-[#18181c] hover:bg-[#222227] border border-[#2a2a30] text-[#92929e] hover:text-[#f4f4f6] transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollContainer(languageScrollRef, 320)}
              className="p-1.5 rounded-md bg-[#18181c] hover:bg-[#222227] border border-[#2a2a30] text-[#92929e] hover:text-[#f4f4f6] transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          ref={languageScrollRef}
          className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth py-1"
        >
          {BROWSE_LANGUAGES.map((lang) => (
            <Link
              key={lang.name}
              to={`/movies?language=${lang.name}`}
              className="w-36 sm:w-40 shrink-0 p-3.5 rounded-lg bg-[#18181c] hover:bg-[#222227] border border-[#2a2a30] hover:border-[#3e3e4a] transition-all group flex flex-col justify-between"
            >
              <div>
                <span className="font-['Outfit'] font-bold text-base text-[#f4f4f6] group-hover:text-white transition-colors block">
                  {lang.name}
                </span>
                <span className="text-xs text-[#92929e] mt-0.5 block">
                  {lang.script}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-[#92929e] group-hover:text-[#e50914] transition-colors">
                <span>Explore</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
