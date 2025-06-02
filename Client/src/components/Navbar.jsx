import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <nav className="bg-white border-b border-gray-200 py-4">
      <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
        <Link to="/" className="font-serif font-bold text-xl text-black">
          Scout AI
        </Link>
        
        {user && (
         <div className="flex items-center gap-4">
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
              to="/history"
              className={`text-sm font-medium ${
                location.pathname === "/history"
                  ? "text-blue-600"
                  : "text-gray-600 hover:text-blue-600"
              }`}
            >
              History
            </Link>
            <Link
              to="/settings"
              className={`text-sm font-medium ${
                location.pathname === "/settings"
                  ? "text-blue-600"
                  : "text-gray-600 hover:text-blue-600"
              }`}
            >
              Settings
            </Link>
            
          
          </div>
        )}

        {!user && (
          <div className="flex gap-4">
            <Link
              to="/"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              Home
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
