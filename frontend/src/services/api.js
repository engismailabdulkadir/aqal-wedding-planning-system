import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wedding_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const activeWeddingId = localStorage.getItem('activeWeddingId');
  if (activeWeddingId) config.headers['X-Wedding-Id'] = activeWeddingId;
  // Let the browser set multipart boundary for FormData uploads
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      const isListingUpload = String(error.config?.url || '').includes('upload-images');
      if (!isListingUpload) {
        localStorage.removeItem('wedding_token');
        localStorage.removeItem('wedding_user');
        localStorage.removeItem('activeWeddingId');
        if (window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
