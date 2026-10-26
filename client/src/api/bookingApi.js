import api from './axios.js';

export const bookingApi = {
  holdSeats: async (showId, seats) => {
    const res = await api.post('/bookings/hold', { showId, seats });
    return res;
  },

  releaseHold: async (bookingId) => {
    const res = await api.delete(`/bookings/${bookingId}/hold`);
    return res.data;
  },

  getBooking: async (bookingId) => {
    const res = await api.get(`/bookings/${bookingId}`);
    return res.data;
  },

  getMyBookings: async (params = {}) => {
    // params: { type: 'upcoming' | 'past', page, limit }
    const res = await api.get('/bookings/my', { params });
    return res.data;
  },

  cancelBooking: async (bookingId) => {
    // POST /api/bookings/:id/cancel
    // Returns { success: true, message, data: cancelledBooking, refund: { refunded, refundId, ... } }
    const res = await api.post(`/bookings/${bookingId}/cancel`);
    return res.data;
  },
};
