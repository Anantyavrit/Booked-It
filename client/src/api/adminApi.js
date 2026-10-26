import api, { getErrorMessage } from './axios.js';

export const adminApi = {
  // Stats
  getStats: async () => {
    const res = await api.get('/admin/stats');
    return res.data;
  },

  // Movies admin (POST/PUT use multipart — do NOT set Content-Type manually)
  createMovie: async (formData) => {
    const res = await api.post('/movies', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  updateMovie: async (id, formData) => {
    const res = await api.put(`/movies/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  deleteMovie: async (id) => {
    const res = await api.delete(`/movies/${id}`);
    return res.data;
  },
  getMoviesAdmin: async (params = {}) => {
    // includeInactive=true so admin sees all
    const res = await api.get('/movies', { params: { ...params, includeInactive: 'true' } });
    return res.data;
  },

  // Theatres admin
  createTheatre: async (data) => {
    const res = await api.post('/theatres', data);
    return res.data;
  },
  updateTheatre: async (id, data) => {
    const res = await api.put(`/theatres/${id}`, data);
    return res.data;
  },
  deleteTheatre: async (id) => {
    const res = await api.delete(`/theatres/${id}`);
    return res.data;
  },
  getTheatresAdmin: async (params = {}) => {
    const res = await api.get('/theatres', { params });
    return res.data;
  },
  getTheatreAdmin: async (id) => {
    const res = await api.get(`/theatres/${id}`);
    return res.data;
  },

  // Shows admin
  createShow: async (data) => {
    const res = await api.post('/shows', data);
    return res.data;
  },
  updateShow: async (id, data) => {
    const res = await api.put(`/shows/${id}`, data);
    return res.data;
  },
  deleteShow: async (id) => {
    const res = await api.delete(`/shows/${id}`);
    return res.data;
  },
  getShowsAdmin: async (params = {}) => {
    // Admin needs all shows including past: don't filter by startTime here, server filters to upcoming by default
    // We pass all query params through
    const res = await api.get('/shows', { params });
    return res.data;
  },

  // Bookings admin (reuse existing GET /api/bookings)
  getBookingsAdmin: async (params = {}) => {
    const res = await api.get('/bookings', { params });
    return res.data;
  },
  getBookingAdmin: async (id) => {
    const res = await api.get(`/bookings/${id}`);
    return res.data;
  },
  cancelBookingAdmin: async (id) => {
    const res = await api.post(`/bookings/${id}/cancel`);
    return res.data;
  },
};

export { getErrorMessage };
