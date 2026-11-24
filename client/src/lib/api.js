import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const AUTH_SKIP_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url || '';

    const shouldSkip = AUTH_SKIP_REFRESH_PATHS.some((path) => requestUrl.includes(path));

    if (status === 401 && originalRequest && !originalRequest._retry && !shouldSkip) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = api.post('/auth/refresh').finally(() => {
            refreshPromise = null;
          });
        }
        await refreshPromise;
        return api(originalRequest);
      } catch (refreshError) {
        window.dispatchEvent(new CustomEvent('td:auth-expired'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
