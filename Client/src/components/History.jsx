import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";
import axiosInstance from "../axios";
import { formatDistanceToNow } from "date-fns";

const History = () => {
  const [searchHistory, setSearchHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSearchHistory = async () => {
      if (!user) {
        setError("User not authenticated");
        setIsLoading(false);
        return;
      }

      try {
        // Debug the user object
        console.log("User object from auth context:", user);
        
        // Get the effective user ID
        const userId = user.uid || user.id || user.user_id || user.email;
        
        if (!userId) {
          console.error("No valid user ID found in user object:", user);
          setError("Could not determine user ID");
          setIsLoading(false);
          return;
        }
        
        console.log("Fetching search history with userId:", userId);
        
        // Try to display helpful debug information in case of errors
        try {
          const response = await axiosInstance.get(`/candidates/search/history/${userId}`);
          console.log("Search history API response:", response.data);
          
          if (response.data && Array.isArray(response.data)) {
            setSearchHistory(response.data);
          } else {
            // If the response is not an array, treat it as empty
            console.warn("Unexpected response format - expected array:", response.data);
            setSearchHistory([]);
          }
        } catch (err) {
          console.error("Error fetching search history:", err);
          
          // Provide more specific error messages based on the error type
          if (err.response?.data?.indexUrl) {
            setError(
              `Database index needs to be created. Please contact the administrator and share this URL: ${err.response.data.indexUrl}`
            );
          } else if (err.response?.status === 404) {
            setError("No search history found for your account");
          } else if (err.response?.status === 403) {
            setError("You don't have permission to access search history");
          } else if (err.response?.status === 401) {
            setError("Authentication required. Please sign in again.");
          } else {
            setError(
              err.response?.data?.message || 
              "Failed to load search history. Please try again later."
            );
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSearchHistory();
  }, [user]);

  const handleSearchClick = (searchId) => {
    navigate(`/s/${searchId}`);
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "completed":
        return <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Completed</span>;
      case "processing":
        return <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Processing</span>;
      case "failed":
        return <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">Failed</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">{status}</span>;
    }
  };

  // Function to get candidates count
  const getCandidatesCount = (search) => {
    if (!search.results) return 0;
    if (search.results.finalResult && Array.isArray(search.results.finalResult)) {
      return search.results.finalResult.length;
    }
    if (search.results.screenedCandidates && Array.isArray(search.results.screenedCandidates)) {
      return search.results.screenedCandidates.length;
    }
    return 0;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Search History</h1>
        
        {error && (
          <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : searchHistory.length > 0 ? (
          <div className="bg-white shadow-sm rounded-xl border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-gray-800">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3">Query</th>
                    <th scope="col" className="px-6 py-3">Date</th>
                    <th scope="col" className="px-6 py-3">Status</th>
                    <th scope="col" className="px-6 py-3">Candidates</th>
                    <th scope="col" className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {searchHistory.map((search) => (
                    <tr key={search.searchId} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900 break-words max-w-xs">
                        {search.query || "Unknown query"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {search.createdAt ? formatDistanceToNow(new Date(search.createdAt), { addSuffix: true }) : "Unknown"}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusLabel(search.status)}
                      </td>
                      <td className="px-6 py-4">
                        {getCandidatesCount(search)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleSearchClick(search.searchId)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          View Results
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 text-center text-gray-500 rounded-xl border border-gray-200 shadow-sm">
            <p>No search history found.</p>
            <button
              onClick={() => navigate('/search')}
              className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
            >
              Start a new search
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
