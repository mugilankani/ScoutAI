import axios from "axios";

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  withCredentials: true, // This is important for cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // If we get a 401, it might mean the access token expired
      // The backend middleware should handle token refresh automatically
      // So we can just retry the original request once
      try {
        return api(originalRequest);
      } catch (retryError) {
        // If retry fails, redirect to login
        window.location.href = "/";
        return Promise.reject(retryError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
