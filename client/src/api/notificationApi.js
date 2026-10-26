import api from './axios.js';

export const notificationApi = {
  getNotifications: async (params = {}) => {
    // params: { page, limit }
    // Returns { success: true, pagination, data: [...] }
    const res = await api.get('/notifications', { params });
    return res.data;
  },

  markRead: async (id) => {
    // PATCH /api/notifications/:id/read
    // Returns { success: true, data: updatedNotification }
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data;
  },
};
