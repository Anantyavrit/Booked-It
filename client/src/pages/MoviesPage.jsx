import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { movieApi } from '../api/movieApi.js';
import { useFetch } from '../hooks/useFetch.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useCity } from '../context/CityContext.jsx';
import SearchBar from '../components/SearchBar.jsx';
import FilterBar from '../components/FilterBar.jsx';
import MovieGrid from '../components/MovieGrid.jsx';
import Pagination from '../components/Pagination.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { Film, Calendar, Globe } from 'lucide-react';

export default function MoviesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedCity, setSelectedCity } = useCity();

  useEffect(() => {
    document.title = 'Explore Movies — IMovies';
  }, []);

  // Read search & filter state from URL
  const querySearch = searchParams.get('search') || '';
  const queryGenre = searchParams.get('genre') || '';
  const queryLanguage = searchParams.get('language') || '';
  const queryStatus = searchParams.get('status') || 'now_showing';
  const queryPage = parseInt(searchParams.get('page') || '1', 10);

  // Local state for immediate typing feedback
  const [searchInput, setSearchInput] = useState(querySearch);
  const debouncedSearch = useDebounce(searchInput, 400);

  // Sync debounced search to URL
  useEffect(() => {
    if (debouncedSearch !== querySearch) {
      updateUrlParams({ search: debouncedSearch, page: 1 });
    }
  }, [debouncedSearch]);

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

  // Fetch filter options (genres, languages)
  const { data: filtersData } = useFetch(() => movieApi.getFilters(), []);
  const availableGenres = filtersData?.data?.genres || [];
  const availableLanguages = filtersData?.data?.languages || [];

  // When browsing Now Showing without search, enforce hasShows: 'true' so users never see zero-showtime titles
  const isNowShowing = queryStatus === 'now_showing' && !querySearch;

  // Fetch movies matching active filters, search, city, and pagination
  const { data: moviesData, loading, error, refetch } = useFetch(
    () =>
      movieApi.getMovies({
        search: querySearch || undefined,
        genre: queryGenre || undefined,
        language: queryLanguage || undefined,
        status: queryStatus || undefined,
        hasShows: isNowShowing ? 'true' : undefined,
        city: isNowShowing ? (selectedCity || undefined) : undefined,
        page: queryPage,
        limit: 12,
        sort: isNowShowing ? 'rating' : 'newest',
      }),
    [querySearch, queryGenre, queryLanguage, queryStatus, selectedCity, queryPage]
  );

  const movies = moviesData?.data || [];
  const pagination = moviesData?.pagination || {};

  const handleStatusChange = (status) => {
    updateUrlParams({ status, page: 1 });
  };

  const handleGenreChange = (newGenre) => {
    updateUrlParams({ genre: newGenre, page: 1 });
  };

  const handleLanguageChange = (newLang) => {
    updateUrlParams({ language: newLang, page: 1 });
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchParams({});
  };

  const handlePageChange = (newPage) => {
    updateUrlParams({ page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8 py-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Explore Movies
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            {isNowShowing && selectedCity
              ? `Showing movies with upcoming screenings in ${selectedCity}`
              : 'Discover top cinema releases, live screenings, and upcoming blockbusters'}
          </p>
        </div>

        <div className="w-full md:w-80">
          <SearchBar
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search by title..."
          />
        </div>
      </div>

      {/* Showing / Category Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-3">
        <button
          type="button"
          onClick={() => handleStatusChange('now_showing')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            queryStatus === 'now_showing'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/40'
              : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Now Showing {selectedCity ? `in ${selectedCity}` : ''}</span>
        </button>

        <button
          type="button"
          onClick={() => handleStatusChange('coming_soon')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            queryStatus === 'coming_soon'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-950/40'
              : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Coming Soon</span>
        </button>

        <button
          type="button"
          onClick={() => handleStatusChange('')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            queryStatus === ''
              ? 'bg-neutral-700 text-white shadow-lg shadow-neutral-950/40'
              : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>More Movies (Full Catalogue)</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-neutral-900/40 border border-neutral-800/80">
        <FilterBar
          genres={availableGenres}
          languages={availableLanguages}
          selectedGenre={queryGenre}
          selectedLanguage={queryLanguage}
          onGenreChange={handleGenreChange}
          onLanguageChange={handleLanguageChange}
          onReset={handleResetFilters}
        />
      </div>

      {/* Movies Grid / Status */}
      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !loading && movies.length === 0 ? (
        <EmptyState
          title={
            isNowShowing && selectedCity
              ? `No active shows in ${selectedCity}`
              : 'No movies found'
          }
          description={
            isNowShowing && selectedCity
              ? `There are currently no scheduled screenings in ${selectedCity}. You can explore other cities or browse the full catalogue.`
              : "We couldn't find any movie matching your current search or filters."
          }
          action={
            <div className="flex flex-wrap gap-2 justify-center">
              {isNowShowing && selectedCity && (
                <button
                  onClick={() => setSelectedCity('')}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors"
                >
                  View All Cities
                </button>
              )}
              <button
                onClick={() => handleStatusChange('')}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors"
              >
                Browse Full Catalogue
              </button>
            </div>
          }
        />
      ) : (
        <div className="space-y-8">
          <MovieGrid movies={movies} loading={loading} skeletonCount={12} />

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
  );
}
