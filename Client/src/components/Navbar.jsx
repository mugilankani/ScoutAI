import { Link, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/search" className="text-2xl font-bold text-gray-900">
          ScoutAI
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/search"
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              location.pathname === "/search"
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
            }`}
          >
            Search
          </Link>
          <Link
            to="/settings"
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              location.pathname === "/settings"
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
            }`}
          >
            Settings
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
