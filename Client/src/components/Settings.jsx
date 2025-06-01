import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";

function Settings() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center text-gray-900 px-4 py-6">
        <div className="flex flex-col items-center justify-center gap-8 max-w-md w-full">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-4 overflow-hidden">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user?.name || "User"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg
                  className="w-12 h-12 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              )}
            </div>
            <h1 className="text-2xl font-serif font-bold mb-1">
              {user?.name || "User"}
            </h1>
            <p className="text-gray-600 mb-4">{user?.email}</p>
            <p className="text-sm text-gray-500 mb-3">
              Member since
              {user?.metadata?.creationTime
                ? new Date(user.metadata.creationTime).toLocaleDateString(
                    "en-US",
                    { month: "long", year: "numeric" }
                  )
                : "December 2024"}
            </p>
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium mb-6">
              Active searches: 1
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="bg-black cursor-pointer text-white px-6 py-2 text-sm font-medium rounded-full hover:bg-gray-800 transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
