import { Routes, Route } from "react-router";
import LandingPage from "./components/LandingPage";
import SearchResults from "./components/SearchResults";
import Settings from "./components/Settings";
import AuthProvider from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./components/HomePage";

function App() {
  return (
    <AuthProvider>
      <div>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/chat"
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
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
