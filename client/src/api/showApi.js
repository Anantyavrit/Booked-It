import api from './axios.js';

export const showApi = {
  getShows: async (params = {}) => {
    // params: { movie, theatre, city, language, date, page, limit }
    const res = await api.get('/shows', { params });
    return res.data;
  },

  getShow: async (id) => {
    const res = await api.get(`/shows/${id}`);
    return res.data;
  },

  getShowSeats: async (id) => {
    const res = await api.get(`/shows/${id}/seats`);
    return res.data;
  },
};
