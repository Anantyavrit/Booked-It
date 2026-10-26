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

export default function MoviesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedCity } = useCity();

  useEffect(() => {
    document.title = 'Explore Movies — IMovies';
  }, []);

  // Read search & filter state from URL
  const querySearch = searchParams.get('search') || '';
  const queryGenre = searchParams.get('genre') || '';
  const queryLanguage = searchParams.get('language') || '';
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

  // Fetch movies matching active filters, search, city, and pagination
  const { data: moviesData, loading, error, refetch } = useFetch(
    () =>
      movieApi.getMovies({
        search: querySearch || undefined,
        genre: queryGenre || undefined,
        language: queryLanguage || undefined,
        city: selectedCity || undefined,
        page: queryPage,
        limit: 10,
        sort: 'newest',
      }),
    [querySearch, queryGenre, queryLanguage, selectedCity, queryPage]
  );

  const movies = moviesData?.data || [];
  const pagination = moviesData?.pagination || {};

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
            Explore All Movies
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            {selectedCity ? `Showing movies scheduled in ${selectedCity}` : 'Discover top releases and upcoming cinema showtimes'}
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
          title="No movies found"
          description="We couldn't find any movie matching your current search or filters."
          action={
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors"
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <div className="space-y-8">
          <MovieGrid movies={movies} loading={loading} skeletonCount={10} />

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
