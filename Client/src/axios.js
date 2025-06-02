import axios from "axios";

// Get the API URL from environment variable, with fallback
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
console.log("API URL configured as:", apiUrl);

// Create axios instance with default config
const api = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000, // Default 60 seconds timeout for most requests (including polling)
});

// Add request logging for debugging
api.interceptors.request.use(
  (config) => {
    const fullUrl = `${config.baseURL}${config.url}`;
    console.log(
      `Making ${config.method?.toUpperCase() || "GET"} request to: ${fullUrl}`
    );
    if (config.data) {
      console.log("Request payload:", config.data);
    }

    // The long timeout for /candidates/search initial POST is no longer needed
    // as it responds quickly with 202. Polling requests will use the default 60s.
    // if (config.url?.includes("/candidates/search") && config.method?.toLowerCase() === 'post') {
    //   // config.timeout = 15 * 60 * 1000; // NOT NEEDED for initial 202
    // }

    // Example: Add Authorization header if user token is available (e.g., from AuthContext)
    // const token = localStorage.getItem('authToken'); // Or get from context
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }

    return config;
  },
  (error) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(
      `Received ${response.status} response from ${response.config.url}`
    );
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // The ECONNABORTED for /candidates/search initial POST is less likely now.
    // This specific handling of 202 on timeout might not be needed.
    // If a POLLING request for /status times out, the polling logic in the component should handle retries.
    // if (
    //   error.code === "ECONNABORTED" &&
    //   originalRequest.url.includes("/candidates/search") // Was for the original long POST
    // ) {
    //   console.log(
    //     "Search request is taking longer than expected. Continuing to wait..."
    //   );
    //   // Return an object that mimics the 202 Accepted response
    //   return {
    //     status: 202, // This was a workaround, now the server sends 202 immediately
    //     data: {
    //       message: "Request accepted, processing in progress (simulated timeout)",
    //       status: "processing",
    //     },
    //   };
    // }

    console.error(
      `API Error (${error.response?.status || error.code || "Network Error"}):`
    );
    console.error("- URL:", originalRequest?.url);
    console.error("- Method:", originalRequest?.method);
    console.error("- Response data:", error.response?.data);
    console.error("- Error message:", error.message);

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Attempt to refresh token or re-authenticate.
        // For simplicity, this example retries the original request.
        // A real app might redirect to login or try a token refresh endpoint.
        console.warn(
          "Received 401, attempting to retry original request once."
        );
        // This is a basic retry, might need a proper token refresh logic here
        // e.g. await refreshToken();
        return api(originalRequest);
      } catch (retryError) {
        console.error("Retry after 401 failed:", retryError);
        // If retry fails, redirect to login or show error
        // window.location.href = "/"; // Or your login page
        return Promise.reject(retryError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
