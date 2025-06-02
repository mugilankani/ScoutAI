import { createContext, useContext, useState, useEffect, useRef } from "react";
import { authService } from "../services/authService.js";

const AuthContext = createContext();

// Toggle this flag to true when you want to bypass Google auth in dev.
const DEV_BYPASS_AUTH = false;

// A dummy user object to use when DEV_BYPASS_AUTH === true.
const DEV_USER = {
  id: "dev-123",
  name: "Developer",
  email: "dev@example.com",
  avatarUrl: "https://via.placeholder.com/150",
};

/**
 * useAuth()
 * — Hook to consume AuthContext. Throws if used outside <AuthProvider>.
 */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};

// ----------- AuthProvider -----------
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // { id, name, email, avatarUrl } or null
  const [isLoading, setIsLoading] = useState(true);
  const authCheckInProgressRef = useRef(false);

  /**
   * checkAuthStatus()
   * — Calls backend to see if there’s an active Google session.
   * — If yes, sets `user` to the returned profile object.
   * — If no, leaves `user` as null.
   */  const checkAuthStatus = async () => {
    if (authCheckInProgressRef.current) {
      console.log("Auth check already in progress, skipping duplicate call");
      return;
    }

    authCheckInProgressRef.current = true;
    try {
      const response = await authService.checkAuthStatus();
      if (response?.user) {
        setUser(response.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Error checking auth status:", err);
      setUser(null);
    } finally {
      authCheckInProgressRef.current = false;
      setIsLoading(false);
    }
  };

  // On mount: either bypass (dev) or call checkAuthStatus()
  useEffect(() => {
    if (DEV_BYPASS_AUTH) {
      // In dev mode: skip real auth and set a dummy user immediately.
      setUser(DEV_USER);
      setIsLoading(false);
    } else {
      checkAuthStatus();
    }
  }, []);

  /**
   * login()
   * — Simply redirect user to Google OAuth flow on the backend.
   * — In dev mode, does nothing (you’re already “logged in” as DEV_USER).
   */  const login = () => {
    if (DEV_BYPASS_AUTH) {
      // No-op in dev mode
      return;
    }
    authService.redirectToGoogleAuth();
  };

  /**
   * logout()
   * — Calls backend to revoke the session, then clears local state.
   * — In dev mode, simply clears the dummy user.
   */  const logout = async () => {
    if (DEV_BYPASS_AUTH) {
      setUser(null);
      return;
    }
    try {
      await authService.logout();
    } catch (err) {
      console.warn("Logout request failed:", err);
      // Even if the call fails, still clear client state
    }
    setUser(null);
    window.location.href = "/";
  };

  // We expose: user (object or null), login(), logout(), and isLoading flag.
  const value = {
    user,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {isLoading ? (
        // You can replace this with any loading spinner you want
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          Checking authentication…
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
