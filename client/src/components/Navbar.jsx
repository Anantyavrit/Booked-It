import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Film, MapPin, Menu, X, LogOut } from 'lucide-react';
import { useCity } from '../context/CityContext.jsx';
import { logout } from '../redux/authSlice.js';

export default function Navbar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { selectedCity, setSelectedCity, cities } = useCity();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-900/30">
              <Film className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
              IMovies
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
            <Link to="/movies" className="text-neutral-300 hover:text-white transition-colors">
              Movies
            </Link>
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className="text-amber-400 hover:text-amber-300 font-semibold transition-colors flex items-center gap-1.5"
              >
                Admin
              </Link>
            )}
          </nav>
        </div>

        {/* City Selector & User Actions */}
        <div className="hidden md:flex items-center gap-4">
          {/* City selector dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
            <MapPin className="w-3.5 h-3.5 text-rose-500" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-transparent text-neutral-200 focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-neutral-900 text-neutral-200">
                All Cities
              </option>
              {cities.map((city) => (
                <option key={city} value={city} className="bg-neutral-900 text-neutral-200">
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* User auth state */}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-300 font-medium">
                Hi, {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 hover:text-white transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex items-center md:hidden gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-neutral-800 bg-neutral-950 p-4 space-y-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
            <MapPin className="w-4 h-4 text-rose-500" />
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setMobileMenuOpen(false);
              }}
              className="bg-transparent text-neutral-200 focus:outline-none w-full"
            >
              <option value="" className="bg-neutral-900 text-neutral-200">
                All Cities
              </option>
              {cities.map((city) => (
                <option key={city} value={city} className="bg-neutral-900 text-neutral-200">
                  {city}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-neutral-900">
            <Link
              to="/movies"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-900 font-medium"
            >
              Explore Movies
            </Link>
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm text-amber-400 font-semibold hover:bg-neutral-900"
              >
                Admin Panel
              </Link>
            )}

            {user ? (
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-rose-400 hover:bg-neutral-900 font-medium text-left"
              >
                <LogOut className="w-4 h-4" />
                Logout ({user.name})
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm text-neutral-100 bg-rose-600 font-medium text-center"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
