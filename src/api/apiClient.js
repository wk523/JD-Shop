import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const adminToken = localStorage.getItem('jdshop_admin_token');
    const customerToken = localStorage.getItem('jdshop_customer_token');

    const isAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

    if (isAdminPath) {
      const token = adminToken || customerToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } else {
      const token = customerToken || adminToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
