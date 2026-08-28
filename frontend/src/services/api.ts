import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for JWT and FormData
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('itam_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Let browser set multipart/form-data boundary for FormData
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for auth errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('itam_token');
      localStorage.removeItem('itam_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error.response?.data || { success: false, message: error.message || 'Network error' });
  }
);

export default api;
