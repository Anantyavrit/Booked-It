import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000, // 15 seconds request timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token from localStorage if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const getErrorMessage = (error) => {
  // Check for offline or network connectivity errors
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'You are currently offline. Please check your internet connection.';
  }

  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return 'Request timed out. Please check your connection and try again.';
  }

  if (error.response?.status === 429) {
    return 'Too many requests, please wait a moment';
  }

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.message === 'Network Error') {
    return 'Unable to reach the server. Please check your connection.';
  }

  return error.message || 'An unexpected error occurred';
};

export default api;
