import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Film,
  MapPin,
  Search,
  ChevronDown,
  Check,
  X,
  LogOut,
  Shield,
  User,
  Home,
  Ticket,
  Loader2,
  Star,
} from 'lucide-react';
import { useCity } from '../context/CityContext.jsx';
import { logout } from '../redux/authSlice.js';
import { movieApi } from '../api/movieApi.js';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { selectedCity, setSelectedCity, popularCities, otherCities } = useCity();

  // Dropdown states
  const [cityOpen, setCityOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Search typeahead states
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Refs for click outside
  const cityDropdownRef = useRef(null);
  const userMenuRef = useRef(null);
  const searchContainerRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Close dropdowns on outside click or escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
        setCityOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchFocused(false);
      }
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(event.target)) {
        setMobileSearchOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setCityOpen(false);
        setUserMenuOpen(false);
        setSearchFocused(false);
        setMobileProfileOpen(false);
        setMobileSearchOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close mobile profile and search on route change
  useEffect(() => {
    setCityOpen(false);
    setUserMenuOpen(false);
    setSearchFocused(false);
    setMobileProfileOpen(false);
    setMobileSearchOpen(false);
  }, [location.pathname]);

  // Debounced search typeahead
  useEffect(() => {
    const q = searchTerm.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await movieApi.getMovies({ search: q, limit: 5 });
        setSearchResults(res.data || []);
      } catch (err) {
        console.error('Typeahead search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const handleLogout = () => {
    dispatch(logout());
    setUserMenuOpen(false);
    setMobileProfileOpen(false);
    navigate('/');
  };

  const handleSelectCity = (cityName) => {
    setSelectedCity(cityName);
    setCityOpen(false);
    setCitySearch('');
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const q = searchTerm.trim();
    if (q) {
      setSearchFocused(false);
      setMobileSearchOpen(false);
      navigate(`/movies?search=${encodeURIComponent(q)}`);
    }
  };

  const handleSelectMovie = (movieId) => {
    setSearchFocused(false);
    setMobileSearchOpen(false);
    setSearchTerm('');
    navigate(`/movies/${movieId}`);
  };

  // Filter cities by search
  const filteredPopularCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    if (!q) return popularCities;
    return popularCities.filter(
      (c) =>
        c.city.toLowerCase().includes(q) ||
        (c.state && c.state.toLowerCase().includes(q))
    );
  }, [popularCities, citySearch]);

  const filteredOtherCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    if (!q) return otherCities;
    return otherCities.filter(
      (c) =>
        c.city.toLowerCase().includes(q) ||
        (c.state && c.state.toLowerCase().includes(q))
    );
  }, [otherCities, citySearch]);

  const isActiveTab = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Top Sticky Solid Navbar */}
      <header className="sticky top-0 z-40 w-full bg-[#18181c] border-b border-[#2a2a30]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3 sm:gap-6">
          {/* Left: Brand Logo & City Selector */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="w-8 h-8 rounded-md bg-[#e50914] flex items-center justify-center text-white font-bold text-sm tracking-wider font-['Outfit'] shadow-sm">
                IM
              </span>
              <span className="font-['Outfit'] font-bold text-lg sm:text-xl tracking-tight text-[#f4f4f6] group-hover:text-white transition-colors">
                IMOVIES
              </span>
            </Link>

            {/* Compact City Dropdown */}
            <div className="relative" ref={cityDropdownRef}>
              <button
                type="button"
                onClick={() => setCityOpen(!cityOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#0f0f11] hover:bg-[#222227] border border-[#2a2a30] text-xs font-medium text-[#f4f4f6] transition-colors cursor-pointer"
                aria-expanded={cityOpen}
                aria-label="Select City"
              >
                <MapPin className="w-3.5 h-3.5 text-[#e50914] shrink-0" />
                <span className="max-w-[85px] sm:max-w-[120px] truncate font-medium">
                  {selectedCity || 'All Cities'}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#92929e] transition-transform ${
                    cityOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* City Dropdown Menu */}
              {cityOpen && (
                <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-[#18181c] border border-[#2a2a30] rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150">
                  {/* Search City Input */}
                  <div className="p-3 border-b border-[#2a2a30] bg-[#0f0f11] flex items-center gap-2">
                    <Search className="w-4 h-4 text-[#92929e] shrink-0" />
                    <input
                      type="text"
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      placeholder="Search city or state..."
                      className="w-full bg-transparent text-xs text-[#f4f4f6] placeholder-[#92929e] focus:outline-none"
                      autoFocus
                    />
                    {citySearch && (
                      <button
                        type="button"
                        onClick={() => setCitySearch('')}
                        className="text-[#92929e] hover:text-[#f4f4f6]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* All Cities Shortcut */}
                  <div className="p-2 border-b border-[#2a2a30] bg-[#18181c]">
                    <button
                      type="button"
                      onClick={() => handleSelectCity('')}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        !selectedCity
                          ? 'bg-[#e50914] text-white font-semibold'
                          : 'text-[#92929e] hover:bg-[#222227] hover:text-[#f4f4f6]'
                      }`}
                    >
                      <span>All Cities (Any Region)</span>
                      {!selectedCity && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Popular & Other Cities list */}
                  <div className="max-h-64 overflow-y-auto p-3 space-y-3">
                    {filteredPopularCities.length > 0 && (
                      <div>
                        <div className="text-[11px] font-semibold text-[#92929e] uppercase tracking-wider mb-2">
                          Popular Cities
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {filteredPopularCities.map((c) => {
                            const isSelected =
                              selectedCity.toLowerCase() === c.city.toLowerCase();
                            return (
                              <button
                                key={c.city}
                                type="button"
                                onClick={() => handleSelectCity(c.city)}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded border text-left text-xs transition-colors ${
                                  isSelected
                                    ? 'bg-[#e50914]/15 border-[#e50914] text-white font-semibold'
                                    : 'bg-[#0f0f11] border-[#2a2a30] text-[#f4f4f6] hover:bg-[#222227] hover:border-[#3e3e4a]'
                                }`}
                              >
                                <span className="truncate">{c.city}</span>
                                {isSelected && (
                                  <Check className="w-3 h-3 text-[#e50914] shrink-0 ml-1" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {filteredOtherCities.length > 0 && (
                      <div>
                        <div className="text-[11px] font-semibold text-[#92929e] uppercase tracking-wider mb-2">
                          {citySearch ? 'Matching Cities' : 'Other Cities'}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {filteredOtherCities.map((c) => {
                            const isSelected =
                              selectedCity.toLowerCase() === c.city.toLowerCase();
                            return (
                              <button
                                key={c.city}
                                type="button"
                                onClick={() => handleSelectCity(c.city)}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded border text-left text-xs transition-colors ${
                                  isSelected
                                    ? 'bg-[#e50914]/15 border-[#e50914] text-white font-semibold'
                                    : 'bg-[#0f0f11] border-[#2a2a30] text-[#92929e] hover:text-[#f4f4f6] hover:bg-[#222227]'
                                }`}
                              >
                                <div className="truncate">
                                  <span>{c.city}</span>
                                  {c.state && (
                                    <span className="text-[10px] text-[#92929e] ml-1 opacity-70">
                                      {c.state}
                                    </span>
                                  )}
                                </div>
                                {isSelected && (
                                  <Check className="w-3 h-3 text-[#e50914] shrink-0 ml-1" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {filteredPopularCities.length === 0 &&
                      filteredOtherCities.length === 0 && (
                        <div className="text-center py-4 text-xs text-[#92929e]">
                          No cities matching "{citySearch}".
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center: Search Field with Live Typeahead (Desktop & Tablet) */}
          <div
            className="hidden sm:block flex-1 max-w-sm lg:max-w-md relative"
            ref={searchContainerRef}
          >
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#92929e] pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Search movies by title, genre..."
                className="w-full pl-9 pr-8 py-2 bg-[#0f0f11] border border-[#2a2a30] rounded-md text-xs text-[#f4f4f6] placeholder-[#92929e] focus:outline-none focus:border-[#e50914] transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#92929e] hover:text-[#f4f4f6]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            {/* Typeahead Dropdown */}
            {searchFocused && searchTerm.trim().length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 bg-[#18181c] border border-[#2a2a30] rounded-lg shadow-2xl overflow-hidden z-50">
                {isSearching ? (
                  <div className="p-4 flex items-center justify-center gap-2 text-xs text-[#92929e]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#e50914]" />
                    Searching movies...
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="divide-y divide-[#2a2a30]">
                    <div className="p-1">
                      {searchResults.map((movie) => (
                        <button
                          key={movie._id}
                          type="button"
                          onClick={() => handleSelectMovie(movie._id)}
                          className="w-full flex items-center gap-3 p-2 rounded hover:bg-[#222227] transition-colors text-left group"
                        >
                          <img
                            src={
                              movie.poster ||
                              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="60" fill="%23222227"/>'
                            }
                            alt={movie.title}
                            className="w-9 h-12 object-cover rounded bg-[#0f0f11] shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-['Outfit'] font-semibold text-xs text-[#f4f4f6] group-hover:text-white truncate">
                              {movie.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#92929e]">
                              <span>{movie.language}</span>
                              {movie.genres?.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">
                                    {movie.genres.slice(0, 2).join(', ')}
                                  </span>
                                </>
                              )}
                              {movie.rating ? (
                                <span className="flex items-center gap-0.5 text-amber-400 font-medium ml-auto shrink-0">
                                  <Star className="w-3 h-3 fill-amber-400" />
                                  {Number(movie.rating).toFixed(1)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="w-full px-3 py-2 text-center text-xs text-[#e50914] font-medium hover:bg-[#222227] transition-colors"
                    >
                      See all results for "{searchTerm}"
                    </button>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-[#92929e]">
                    No movies found matching "{searchTerm}".
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Actions, Links, and User Menu */}
          <div className="flex items-center gap-3">
            {/* Mobile Search Toggle Icon */}
            <button
              type="button"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="sm:hidden p-2 rounded-md text-[#92929e] hover:text-[#f4f4f6] hover:bg-[#222227] transition-colors"
              aria-label="Open Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Desktop Navigation Link */}
            <Link
              to="/movies"
              className="hidden lg:inline-flex text-xs font-medium text-[#92929e] hover:text-[#f4f4f6] transition-colors"
            >
              Movies
            </Link>

            {/* Admin Badge/Link */}
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#222227] border border-amber-500/30 text-xs font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </Link>
            )}

            {/* Auth: User Profile Menu or Sign In */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-md bg-[#0f0f11] hover:bg-[#222227] border border-[#2a2a30] text-xs font-medium text-[#f4f4f6] transition-colors cursor-pointer"
                  aria-expanded={userMenuOpen}
                >
                  <span className="w-6 h-6 rounded-full bg-[#e50914]/20 border border-[#e50914]/40 flex items-center justify-center text-[11px] font-bold text-white">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </span>
                  <span className="hidden sm:inline font-medium max-w-[100px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[#92929e] transition-transform ${
                      userMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* User Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-[#18181c] border border-[#2a2a30] rounded-lg shadow-2xl p-1 z-50 animate-in fade-in duration-150">
                    <div className="px-3 py-2 border-b border-[#2a2a30]">
                      <div className="font-semibold text-xs text-[#f4f4f6] truncate">
                        {user.name}
                      </div>
                      <div className="text-[11px] text-[#92929e] truncate">
                        {user.email}
                      </div>
                    </div>

                    <div className="py-1">
                      {user.role === 'admin' && (
                        <Link
                          to="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs text-amber-400 hover:bg-[#222227] rounded transition-colors"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>Admin Console</span>
                        </Link>
                      )}

                      <Link
                        to="/movies"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#f4f4f6] hover:bg-[#222227] rounded transition-colors"
                      >
                        <Film className="w-3.5 h-3.5 text-[#92929e]" />
                        <span>Browse Movies</span>
                      </Link>
                    </div>

                    <div className="pt-1 border-t border-[#2a2a30]">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#e50914] hover:bg-[#222227] rounded transition-colors text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="btn-base px-3.5 py-1.5 text-xs font-semibold rounded-md bg-[#e50914] hover:bg-[#c80812] text-white transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Expandable Mobile Search Bar */}
        {mobileSearchOpen && (
          <div
            ref={mobileSearchRef}
            className="sm:hidden px-4 py-3 bg-[#0f0f11] border-t border-[#2a2a30] animate-in slide-in-from-top-2 duration-150"
          >
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#92929e] pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search movies by title, genre..."
                className="w-full pl-9 pr-8 py-2 bg-[#18181c] border border-[#2a2a30] rounded-md text-xs text-[#f4f4f6] placeholder-[#92929e] focus:outline-none focus:border-[#e50914]"
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#92929e] hover:text-[#f4f4f6]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            {searchTerm.trim().length > 0 && (
              <div className="mt-2 bg-[#18181c] border border-[#2a2a30] rounded-lg overflow-hidden">
                {isSearching ? (
                  <div className="p-3 text-center text-xs text-[#92929e]">
                    Searching...
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="divide-y divide-[#2a2a30]">
                    {searchResults.map((m) => (
                      <button
                        key={m._id}
                        type="button"
                        onClick={() => handleSelectMovie(m._id)}
                        className="w-full flex items-center gap-2 p-2 text-left hover:bg-[#222227]"
                      >
                        <img
                          src={m.poster}
                          alt={m.title}
                          className="w-8 h-10 object-cover rounded bg-[#0f0f11]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-[#f4f4f6] truncate">
                            {m.title}
                          </div>
                          <div className="text-[11px] text-[#92929e]">
                            {m.language} • {m.genres?.slice(0, 1).join(', ')}
                          </div>
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="w-full p-2 text-center text-xs text-[#e50914] font-medium"
                    >
                      See all results
                    </button>
                  </div>
                ) : (
                  <div className="p-3 text-center text-xs text-[#92929e]">
                    No movies found.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Mobile Bottom Tab Bar (Fixed at Bottom for Small Viewports) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 z-40 bg-[#18181c] border-t border-[#2a2a30] h-16 flex items-center justify-around px-2 md:hidden"
      >
        {/* 1. Home Tab */}
        <Link
          to="/"
          className={`flex flex-col items-center justify-center gap-1 w-16 py-1 transition-colors ${
            isActiveTab('/')
              ? 'text-[#e50914]'
              : 'text-[#92929e] hover:text-[#f4f4f6]'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight">Home</span>
        </Link>

        {/* 2. Movies Tab */}
        <Link
          to="/movies"
          className={`flex flex-col items-center justify-center gap-1 w-16 py-1 transition-colors ${
            isActiveTab('/movies')
              ? 'text-[#e50914]'
              : 'text-[#92929e] hover:text-[#f4f4f6]'
          }`}
        >
          <Film className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight">Movies</span>
        </Link>

        {/* 3. Bookings Tab */}
        <Link
          to={
            user?.role === 'admin'
              ? '/admin/bookings'
              : user
              ? '/movies'
              : '/login'
          }
          className={`flex flex-col items-center justify-center gap-1 w-16 py-1 transition-colors ${
            isActiveTab('/admin/bookings')
              ? 'text-[#e50914]'
              : 'text-[#92929e] hover:text-[#f4f4f6]'
          }`}
        >
          <Ticket className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight">Bookings</span>
        </Link>

        {/* 4. Profile Tab */}
        {user ? (
          <button
            type="button"
            onClick={() => setMobileProfileOpen(true)}
            className="flex flex-col items-center justify-center gap-1 w-16 py-1 text-[#92929e] hover:text-[#f4f4f6] transition-colors"
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-tight truncate max-w-[56px]">
              {user.name?.split(' ')[0] || 'Profile'}
            </span>
          </button>
        ) : (
          <Link
            to="/login"
            className={`flex flex-col items-center justify-center gap-1 w-16 py-1 transition-colors ${
              isActiveTab('/login')
                ? 'text-[#e50914]'
                : 'text-[#92929e] hover:text-[#f4f4f6]'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-tight">Sign In</span>
          </Link>
        )}
      </nav>

      {/* Mobile Profile Bottom Sheet Modal */}
      {mobileProfileOpen && user && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 animate-in fade-in duration-200 md:hidden">
          <div className="w-full bg-[#18181c] border-t border-[#2a2a30] rounded-t-2xl p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#2a2a30]">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-[#e50914]/20 border border-[#e50914]/50 flex items-center justify-center text-sm font-bold text-white">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </span>
                <div>
                  <div className="font-['Outfit'] font-bold text-sm text-[#f4f4f6]">
                    {user.name}
                  </div>
                  <div className="text-xs text-[#92929e]">{user.email}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileProfileOpen(false)}
                className="p-1 rounded text-[#92929e] hover:text-[#f4f4f6]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => setMobileProfileOpen(false)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Admin Panel
                  </span>
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </Link>
              )}

              <Link
                to="/movies"
                onClick={() => setMobileProfileOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-[#f4f4f6] hover:bg-[#222227]"
              >
                <span className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#92929e]" />
                  Browse Movies
                </span>
                <ChevronDown className="w-4 h-4 -rotate-90 text-[#92929e]" />
              </Link>
            </div>

            <div className="pt-2 border-t border-[#2a2a30]">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#e50914] hover:bg-[#c80812] transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
