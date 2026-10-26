import React from 'react';

export default function FilterBar({
  genres = [],
  languages = [],
  selectedGenre = '',
  selectedLanguage = '',
  onGenreChange,
  onLanguageChange,
  onReset,
}) {
  const hasActiveFilters = Boolean(selectedGenre || selectedLanguage);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Genre Filter */}
      <select
        value={selectedGenre}
        onChange={(e) => onGenreChange(e.target.value)}
        className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs sm:text-sm text-neutral-200 focus:outline-none focus:border-rose-500 cursor-pointer"
      >
        <option value="">All Genres</option>
        {genres.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>

      {/* Language Filter */}
      <select
        value={selectedLanguage}
        onChange={(e) => onLanguageChange(e.target.value)}
        className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs sm:text-sm text-neutral-200 focus:outline-none focus:border-rose-500 cursor-pointer"
      >
        <option value="">All Languages</option>
        {languages.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>

      {/* Reset Filter Button */}
      {hasActiveFilters && (
        <button
          onClick={onReset}
          className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1 transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
