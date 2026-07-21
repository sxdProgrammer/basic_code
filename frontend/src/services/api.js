import axios from 'axios';

// Create axios instance with backend proxy base URL
const api = axios.create({
  baseURL: '/best_code/backend/public',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically attach JWT Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiry / unauthorized requests
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear session cache and redirect to login on token expiration
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.hash !== '#/login') {
        window.location.href = '#/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
