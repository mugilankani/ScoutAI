import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";

function Settings() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">
            Settings
          </h1>
          <p className="text-gray-600">Manage your account and preferences</p>
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Profile Information
          </h2>

          <div className="flex items-center gap-6 mb-6">
            <div className="relative">
              <img
                src={
                  user.avatar ||
                  user.picture ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user.name || user.email
                  )}&background=6366f1&color=fff`
                }
                alt={user.name || user.email}
                className="w-20 h-20 rounded-full border-4 border-gray-100"
              />
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {user.name || user.displayName || "User"}
              </h3>
              <p className="text-gray-600">{user.email}</p>
              {user.id && (
                <p className="text-sm text-gray-500 mt-1">ID: {user.id}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <p className="text-gray-900">
                {user.name || user.displayName || "Not provided"}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <p className="text-gray-900">{user.email || "Not provided"}</p>
            </div>

            {user.given_name && (
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <p className="text-gray-900">{user.given_name}</p>
              </div>
            )}

            {user.family_name && (
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <p className="text-gray-900">{user.family_name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Account Actions
          </h2>

          <div className="space-y-4">
            <button
              onClick={handleLogout}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* App Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            About ScoutAI
          </h2>
          <p className="text-gray-600 text-sm">
            ScoutAI helps you find the best talent for your organization using
            AI-powered search capabilities.
          </p>
          <p className="text-gray-500 text-xs mt-2">Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
}

export default Settings;
