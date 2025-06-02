import { Routes, Route } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import SearchResults from "./components/SearchResults";
import Settings from "./components/Settings";import History from "./components/History";
import AuthProvider from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./components/HomePage";
import PersonProfile from "./components/PersonProfile";

function App() {
  return (
    <AuthProvider>
      <div>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/s/:searchId"
            element={
              <ProtectedRoute>
                <SearchResults />
              </ProtectedRoute>
            }
          />
          <Route
            path="/p/:personId"
            element={
              <ProtectedRoute>
                <PersonProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
