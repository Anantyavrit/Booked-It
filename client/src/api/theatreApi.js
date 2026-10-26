import api from './axios.js';

export const theatreApi = {
  getCities: async () => {
    const res = await api.get('/theatres/cities');
    return res.data;
  },

  getTheatres: async (params = {}) => {
    const res = await api.get('/theatres', { params });
    return res.data;
  },
};
