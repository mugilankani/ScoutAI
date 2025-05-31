import { Link, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/chat" className="text-2xl font-bold text-gray-900">
          ScoutAI
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-6">
          <Link
            to="/chat"
            className={`text-sm font-medium transition-colors ${
              location.pathname === "/chat"
                ? "text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Search
          </Link>
          <Link
            to="/settings"
            className={`text-sm font-medium transition-colors ${
              location.pathname === "/settings"
                ? "text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Settings
          </Link>

          {/* User Menu */}
          {user && (
            <div className="flex items-center gap-3">
              <img
                src={
                  user.avatar ||
                  `https://ui-avatars.com/api/?name=${user.name}&background=6366f1&color=fff`
                }
                alt={user.name}
                className="w-8 h-8 rounded-full"
              />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
