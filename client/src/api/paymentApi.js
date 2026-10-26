import api from './axios.js';

export const paymentApi = {
  createOrder: async (bookingId) => {
    // POST /api/payments/create-order
    // Returns { success: true, data: { orderId, amount, currency, keyId, bookingId } }
    const res = await api.post('/payments/create-order', { bookingId });
    return res.data;
  },

  verifyPayment: async (payload) => {
    // POST /api/payments/verify
    // payload: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
    // Returns { success: true, message, data: confirmedBooking }
    const res = await api.post('/payments/verify', payload);
    return res.data;
  },

  reportFailure: async (razorpay_order_id, reason) => {
    // POST /api/payments/failed
    // payload: { razorpay_order_id, reason }
    const res = await api.post('/payments/failed', { razorpay_order_id, reason });
    return res.data;
  },

  getMyPayments: async (params = {}) => {
    const res = await api.get('/payments/my', { params });
    return res.data;
  },
};
