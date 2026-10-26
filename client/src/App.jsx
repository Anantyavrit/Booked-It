import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CityProvider } from './context/CityContext.jsx';
import { loadUser } from './redux/authSlice.js';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';

// Core layout components (eagerly loaded)
import Home from './pages/Home.jsx';

// Lazy-loaded pages with code splitting
const MoviesPage = lazy(() => import('./pages/MoviesPage.jsx'));
const MovieDetailPage = lazy(() => import('./pages/MovieDetailPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const SeatPickerPage = lazy(() => import('./pages/SeatPickerPage.jsx'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage.jsx'));
const BookingConfirmationPage = lazy(() => import('./pages/BookingConfirmationPage.jsx'));
const PaymentFailedPage = lazy(() => import('./pages/PaymentFailedPage.jsx'));

// Lazy-loaded admin components
const AdminLayout = lazy(() => import('./components/admin/AdminLayout.jsx'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage.jsx'));
const AdminMoviesPage = lazy(() => import('./pages/admin/AdminMoviesPage.jsx'));
const AdminTheatresPage = lazy(() => import('./pages/admin/AdminTheatresPage.jsx'));
const AdminShowsPage = lazy(() => import('./pages/admin/AdminShowsPage.jsx'));
const AdminBookingsPage = lazy(() => import('./pages/admin/AdminBookingsPage.jsx'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage.jsx'));

// Reusable spinner component for Suspense fallback
function PageLoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-neutral-400"
    >
      <div className="w-8 h-8 rounded-full border-2 border-neutral-800 border-t-amber-500 animate-spin" />
      <span className="text-xs font-medium tracking-wide">Loading...</span>
    </div>
  );
}

function SiteLayout() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between selection:bg-rose-500 selection:text-white antialiased">
      <div className="print:hidden">
        <OfflineBanner />
        <Navbar />
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 pb-16 print:p-0 print:m-0 print:max-w-none">
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            {/* Public browsing routes */}
            <Route path="/" element={<Home />} />
            <Route path="/movies" element={<MoviesPage />} />
            <Route path="/movies/:id" element={<MovieDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected seat booking & payment routes */}
            <Route
              path="/shows/:showId/seats"
              element={
                <ProtectedRoute>
                  <SeatPickerPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/checkout/:bookingId"
              element={
                <ProtectedRoute>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/booking/:id/confirmation"
              element={
                <ProtectedRoute>
                  <BookingConfirmationPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/payment/failed"
              element={
                <ProtectedRoute>
                  <PaymentFailedPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      <footer className="border-t border-neutral-900 bg-neutral-950/80 py-8 text-center text-xs text-neutral-500 print:hidden">
        <p>© {new Date().getFullYear()} IMovies. All rights reserved. MERN Cinematic Cinema Booking.</p>
      </footer>

      <div className="print:hidden">
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
          theme="dark"
          aria-live="polite"
        />
      </div>
    </div>
  );
}

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);

  return (
    <ErrorBoundary>
      <CityProvider>
        <BrowserRouter>
          <Routes>
            {/* Admin routes with dedicated AdminLayout outside main site container */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly={true}>
                  <ErrorBoundary>
                    <Suspense fallback={<PageLoadingFallback />}>
                      <AdminLayout />
                    </Suspense>
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="movies" element={<AdminMoviesPage />} />
              <Route path="theatres" element={<AdminTheatresPage />} />
              <Route path="shows" element={<AdminShowsPage />} />
              <Route path="bookings" element={<AdminBookingsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
            </Route>

            {/* Public and User facing routes */}
            <Route path="/*" element={<SiteLayout />} />
          </Routes>
        </BrowserRouter>
      </CityProvider>
    </ErrorBoundary>
  );
}

export default App;
