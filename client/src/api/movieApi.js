import api from './axios.js';

export const movieApi = {
  getMovies: async (params = {}) => {
    // params: { search, genre, language, certificate, city, theatre, date, sort, page, limit }
    const res = await api.get('/movies', { params });
    return res.data;
  },

  getMovie: async (id) => {
    const res = await api.get(`/movies/${id}`);
    return res.data;
  },

  getFilters: async () => {
    const res = await api.get('/movies/filters');
    return res.data;
  },

  getMovieShows: async (movieId, params = {}) => {
    // params: { city, date }
    const res = await api.get(`/movies/${movieId}/shows`, { params });
    return res.data;
  },
};
