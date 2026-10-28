import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Film,
  Calendar,
  Globe,
  SlidersHorizontal,
  X,
  MapPin,
  Check,
  RotateCcw,
} from 'lucide-react';
import { movieApi } from '../api/movieApi.js';
import { useFetch } from '../hooks/useFetch.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useCity } from '../context/CityContext.jsx';
import SearchBar from '../components/SearchBar.jsx';
import MovieCard from '../components/MovieCard.jsx';
import MovieCardSkeleton from '../components/MovieCardSkeleton.jsx';
import Pagination from '../components/Pagination.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';

const DEFAULT_LANGUAGES = ['Hindi', 'English', 'Telugu', 'Tamil', 'Malayalam', 'Kannada'];
const DEFAULT_GENRES = ['Action', 'Drama', 'Comedy', 'Thriller', 'Romance', 'Sci-Fi', 'Horror', 'Adventure', 'Animation', 'Crime'];
const FORMATS = ['2D', '3D', 'IMAX', '4DX'];
const CERTIFICATES = ['U', 'UA', 'A'];

export default function MoviesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedCity, setSelectedCity } = useCity();

  // Mobile bottom sheet state
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  useEffect(() => {
    document.title = 'Explore Movies — IMovies';
  }, []);

  // Read filter & sort state from URL
  const querySearch = searchParams.get('search') || '';
  const queryGenre = searchParams.get('genre') || '';
  const queryLanguage = searchParams.get('language') || '';
  const queryFormat = searchParams.get('format') || '';
  const queryCertificate = searchParams.get('certificate') || '';
  const queryStatus = searchParams.get('status') || 'now_showing';
  const querySort = searchParams.get('sort') || (queryStatus === 'now_showing' ? 'rating' : 'newest');
  const queryPage = parseInt(searchParams.get('page') || '1', 10);

  // Local state for immediate typing feedback
  const [searchInput, setSearchInput] = useState(querySearch);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Sync debounced search to URL
  useEffect(() => {
    if (debouncedSearch !== querySearch) {
      updateUrlParams({ search: debouncedSearch, page: 1 });
    }
  }, [debouncedSearch]);

  // Keep local search input synced if URL changes externally
  useEffect(() => {
    setSearchInput(querySearch);
  }, [querySearch]);

  const updateUrlParams = (newParams) => {
    const updated = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        updated.set(key, val);
      } else {
        updated.delete(key);
      }
    });
    setSearchParams(updated);
  };

  // Fetch filter options (genres, languages) from backend
  const { data: filtersData } = useFetch(() => movieApi.getFilters(), []);
  const availableGenres = useMemo(() => {
    const backend = filtersData?.data?.genres || [];
    return backend.length > 0 ? backend : DEFAULT_GENRES;
  }, [filtersData]);

  const availableLanguages = useMemo(() => {
    const backend = filtersData?.data?.languages || [];
    return backend.length > 0 ? backend : DEFAULT_LANGUAGES;
  }, [filtersData]);

  // Enforce hasShows='true' when browsing Now Showing without search
  const isNowShowing = queryStatus === 'now_showing' && !querySearch;

  // Fetch movies matching active filters, search, city, and pagination
  const {
    data: moviesData,
    loading,
    error,
    refetch,
  } = useFetch(
    () =>
      movieApi.getMovies({
        search: querySearch || undefined,
        genre: queryGenre || undefined,
        language: queryLanguage || undefined,
        certificate: queryCertificate || undefined,
        status: queryStatus || undefined,
        hasShows: isNowShowing ? 'true' : undefined,
        city: isNowShowing ? selectedCity || undefined : undefined,
        sort: querySort,
        page: queryPage,
        limit: 12,
      }),
    [
      querySearch,
      queryGenre,
      queryLanguage,
      queryCertificate,
      queryStatus,
      querySort,
      selectedCity,
      queryPage,
    ]
  );

  // Apply client-side format filter if requested (so format works without server schema changes)
  const rawMovies = moviesData?.data || [];
  const movies = useMemo(() => {
    if (!queryFormat) return rawMovies;
    return rawMovies.filter(
      (m) => Array.isArray(m.formats) && m.formats.includes(queryFormat)
    );
  }, [rawMovies, queryFormat]);

  const pagination = moviesData?.pagination || {};

  // Handlers
  const handleStatusChange = (status) => {
    updateUrlParams({ status, page: 1 });
  };

  const handleToggleFilter = (key, value) => {
    const currentVal = searchParams.get(key) || '';
    const nextVal = currentVal.toLowerCase() === value.toLowerCase() ? '' : value;
    updateUrlParams({ [key]: nextVal, page: 1 });
  };

  const handleRemoveFilter = (key) => {
    updateUrlParams({ [key]: '', page: 1 });
    if (key === 'search') setSearchInput('');
  };

  const handleResetAllFilters = () => {
    setSearchInput('');
    setSearchParams(queryStatus ? { status: queryStatus } : {});
  };

  const handleSortChange = (e) => {
    updateUrlParams({ sort: e.target.value, page: 1 });
  };

  const handlePageChange = (newPage) => {
    updateUrlParams({ page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Active filters list for removable chips
  const activeFilters = useMemo(() => {
    const list = [];
    if (querySearch) list.push({ key: 'search', label: 'Search', value: querySearch });
    if (queryLanguage) list.push({ key: 'language', label: 'Language', value: queryLanguage });
    if (queryGenre) list.push({ key: 'genre', label: 'Genre', value: queryGenre });
    if (queryFormat) list.push({ key: 'format', label: 'Format', value: queryFormat });
    if (queryCertificate) list.push({ key: 'certificate', label: 'Certificate', value: queryCertificate });
    return list;
  }, [querySearch, queryLanguage, queryGenre, queryFormat, queryCertificate]);

  const totalActiveFilterCount = activeFilters.length;

  // Filter content block (shared between Desktop Sidebar and Mobile Bottom Sheet)
  const FilterGroups = () => (
    <div className="space-y-6">
      {/* 1. Language Group */}
      <div>
        <h3 className="text-xs font-semibold text-[#92929e] uppercase tracking-wider mb-2.5">
          Language
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {availableLanguages.map((lang) => {
            const isSelected = queryLanguage.toLowerCase() === lang.toLowerCase();
            return (
              <button
                key={lang}
                type="button"
                onClick={() => handleToggleFilter('language', lang)}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#e50914] text-white font-semibold'
                    : 'bg-[#0f0f11] text-[#92929e] hover:text-[#f4f4f6] border border-[#2a2a30] hover:border-[#3e3e4a]'
                }`}
              >
                {lang}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Genre Group */}
      <div>
        <h3 className="text-xs font-semibold text-[#92929e] uppercase tracking-wider mb-2.5">
          Genre
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {availableGenres.map((g) => {
            const isSelected = queryGenre.toLowerCase() === g.toLowerCase();
            return (
              <button
                key={g}
                type="button"
                onClick={() => handleToggleFilter('genre', g)}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#e50914] text-white font-semibold'
                    : 'bg-[#0f0f11] text-[#92929e] hover:text-[#f4f4f6] border border-[#2a2a30] hover:border-[#3e3e4a]'
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Format Group */}
      <div>
        <h3 className="text-xs font-semibold text-[#92929e] uppercase tracking-wider mb-2.5">
          Format
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {FORMATS.map((fmt) => {
            const isSelected = queryFormat.toLowerCase() === fmt.toLowerCase();
            return (
              <button
                key={fmt}
                type="button"
                onClick={() => handleToggleFilter('format', fmt)}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#e50914] text-white font-semibold'
                    : 'bg-[#0f0f11] text-[#92929e] hover:text-[#f4f4f6] border border-[#2a2a30] hover:border-[#3e3e4a]'
                }`}
              >
                {fmt}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Certificate Group */}
      <div>
        <h3 className="text-xs font-semibold text-[#92929e] uppercase tracking-wider mb-2.5">
          Certificate
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {CERTIFICATES.map((cert) => {
            const isSelected = queryCertificate.toUpperCase() === cert.toUpperCase();
            return (
              <button
                key={cert}
                type="button"
                onClick={() => handleToggleFilter('certificate', cert)}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#e50914] text-white font-semibold'
                    : 'bg-[#0f0f11] text-[#92929e] hover:text-[#f4f4f6] border border-[#2a2a30] hover:border-[#3e3e4a]'
                }`}
              >
                {cert}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 py-4 sm:py-6">
      {/* 1. Header Toolbar: Title, Tabs & Search */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="font-['Outfit'] text-2xl sm:text-3xl font-bold tracking-tight text-[#f4f4f6]">
              Explore Movies
            </h1>
            <p className="text-xs text-[#92929e] mt-0.5">
              {isNowShowing && selectedCity
                ? `Active screenings curated for ${selectedCity}`
                : 'Browse cinema blockbusters and upcoming theatrical releases'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {/* Search Input */}
            <div className="flex-1 md:w-72">
              <SearchBar
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Filter by title..."
              />
            </div>

            {/* Mobile Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#18181c] border border-[#2a2a30] text-xs font-semibold text-[#f4f4f6] hover:bg-[#222227] transition-colors"
              aria-label="Open Filters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#e50914]" />
              <span>Filters</span>
              {totalActiveFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#e50914] text-[10px] text-white flex items-center justify-center font-bold">
                  {totalActiveFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Category Tabs & Sort Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2a2a30] pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => handleStatusChange('now_showing')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                queryStatus === 'now_showing'
                  ? 'bg-[#e50914] text-white'
                  : 'bg-[#18181c] text-[#92929e] hover:text-[#f4f4f6] border border-[#2a2a30]'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Now Showing {selectedCity ? `(${selectedCity})` : ''}</span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusChange('coming_soon')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                queryStatus === 'coming_soon'
                  ? 'bg-[#e50914] text-white'
                  : 'bg-[#18181c] text-[#92929e] hover:text-[#f4f4f6] border border-[#2a2a30]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Coming Soon</span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusChange('')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                queryStatus === ''
                  ? 'bg-[#e50914] text-white'
                  : 'bg-[#18181c] text-[#92929e] hover:text-[#f4f4f6] border border-[#2a2a30]'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>All Movies</span>
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-[#92929e]">
            <span>Sort by:</span>
            <select
              value={querySort}
              onChange={handleSortChange}
              className="bg-[#18181c] border border-[#2a2a30] text-[#f4f4f6] text-xs rounded-md px-2.5 py-1 focus:outline-none focus:border-[#e50914] cursor-pointer"
            >
              <option value="rating">Rating (High to Low)</option>
              <option value="newest">Newest Releases</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>

        {/* 2. Active Removable Filter Chips */}
        {totalActiveFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-[#92929e]">Active:</span>
            {activeFilters.map((f) => (
              <span
                key={f.key}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#18181c] border border-[#2a2a30] text-xs text-[#f4f4f6]"
              >
                <span className="text-[#92929e]">{f.label}:</span>
                <span className="font-medium">{f.value}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFilter(f.key)}
                  className="text-[#92929e] hover:text-[#e50914] ml-0.5 cursor-pointer"
                  aria-label={`Remove filter ${f.label}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            <button
              type="button"
              onClick={handleResetAllFilters}
              className="text-xs text-[#e50914] hover:underline font-medium ml-1 cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear all</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Main Body: Left Sidebar + Movie Grid */}
      <div className="flex items-start gap-6 lg:gap-8">
        {/* Desktop Left Filter Sidebar */}
        <aside className="hidden lg:block w-64 xl:w-72 shrink-0 bg-[#18181c] border border-[#2a2a30] rounded-lg p-5 sticky top-20">
          <div className="flex items-center justify-between pb-4 border-b border-[#2a2a30] mb-5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#e50914]" />
              <h2 className="font-['Outfit'] font-bold text-sm text-[#f4f4f6]">
                Filters
              </h2>
            </div>
            {totalActiveFilterCount > 0 && (
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="text-[11px] text-[#e50914] hover:underline font-medium cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>

          <FilterGroups />
        </aside>

        {/* Right Content Area: Movies Grid, Skeletons, Empty States */}
        <div className="flex-1 min-w-0">
          {error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : loading ? (
            /* Layout-matching skeleton grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <MovieCardSkeleton key={i} />
              ))}
            </div>
          ) : movies.length === 0 ? (
            /* Empty State */
            <EmptyState
              title={
                isNowShowing && selectedCity
                  ? `No screenings found in ${selectedCity}`
                  : 'No movies match your filters'
              }
              description={
                isNowShowing && selectedCity
                  ? `There are currently no scheduled screenings in ${selectedCity} matching these filters. You can clear filters or explore other cities.`
                  : 'Try adjusting or clearing your active filters (e.g. language, format, certificate) to view more movies.'
              }
              action={
                <div className="flex flex-wrap gap-2 justify-center">
                  {totalActiveFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetAllFilters}
                      className="px-4 py-2 rounded-md bg-[#e50914] hover:bg-[#c80812] text-xs font-semibold text-white transition-colors cursor-pointer"
                    >
                      Clear All Filters
                    </button>
                  )}
                  {isNowShowing && selectedCity && (
                    <button
                      type="button"
                      onClick={() => setSelectedCity('')}
                      className="px-4 py-2 rounded-md bg-[#222227] hover:bg-[#2a2a30] border border-[#2a2a30] text-xs font-semibold text-[#f4f4f6] transition-colors cursor-pointer"
                    >
                      View All Cities
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleStatusChange('')}
                    className="px-4 py-2 rounded-md bg-[#0f0f11] hover:bg-[#18181c] border border-[#2a2a30] text-xs font-semibold text-[#92929e] hover:text-[#f4f4f6] transition-colors cursor-pointer"
                  >
                    Browse Full Catalogue
                  </button>
                </div>
              }
            />
          ) : (
            /* Results Grid */
            <div className="space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {movies.map((movie) => (
                  <MovieCard key={movie._id} movie={movie} />
                ))}
              </div>

              {/* Pagination */}
              <Pagination
                page={pagination.page || queryPage}
                totalPages={pagination.totalPages || 1}
                hasNext={pagination.hasNext}
                hasPrev={pagination.hasPrev}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* 4. Mobile Filter Bottom Sheet Modal */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 animate-in fade-in duration-200 lg:hidden">
          <div className="w-full max-h-[85vh] bg-[#18181c] border-t border-[#2a2a30] rounded-t-2xl flex flex-col overflow-hidden">
            {/* Sheet Header */}
            <div className="p-4 border-b border-[#2a2a30] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#e50914]" />
                <h3 className="font-['Outfit'] font-bold text-sm text-[#f4f4f6]">
                  Filter Movies
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {totalActiveFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetAllFilters}
                    className="text-xs text-[#e50914] font-medium hover:underline cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-1 rounded text-[#92929e] hover:text-[#f4f4f6]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sheet Scrollable Body */}
            <div className="p-5 overflow-y-auto flex-1">
              <FilterGroups />
            </div>

            {/* Sheet Footer CTA */}
            <div className="p-4 border-t border-[#2a2a30] bg-[#18181c] shrink-0">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="btn-base w-full py-2.5 rounded-md bg-[#e50914] hover:bg-[#c80812] text-xs font-semibold text-white transition-colors"
              >
                Apply Filters {totalActiveFilterCount > 0 ? `(${totalActiveFilterCount})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
