import api from "../axios.js";

export const authService = {
  // Check if user is authenticated
  async checkAuthStatus() {
    try {
      const response = await api.get("/auth/status");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Logout user
  async logout() {
    try {
      const response = await api.post("/auth/logout");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get current user
  async getCurrentUser() {
    try {
      const response = await api.get("/auth/status");
      return response.data?.user || null;
    } catch (error) {
      return null;
    }
  },

  // Redirect to Google OAuth
  redirectToGoogleAuth() {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  },
};
