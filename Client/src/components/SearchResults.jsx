import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";
import TalentRow from "./TalentRow";
import axiosInstance from "../axios";

// Add the missing constants
const POLLING_INTERVAL = 7000; // Poll every 7 seconds
const MAX_POLL_DURATION = 20 * 60 * 1000; // Max 20 minutes of polling

const SearchResults = () => {
  const { searchId: paramSearchId } = useParams(); // This will be the server-generated ID
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Initialize state from location.state if available (passed from HomePage)
  const passedInitialData = location.state?.initialData;
  const passedQuery = location.state?.query;

  const [currentSearchId, setCurrentSearchId] = useState(paramSearchId || null);
  const [isLoading, setIsLoading] = useState(true); // Start true if paramSearchId is present
  const [loadingProgress, setLoadingProgress] = useState(
    passedInitialData?.progress || 0
  );
  const [loadingMessage, setLoadingMessage] = useState(
    passedInitialData?.statusMessage || "Loading search status..."
  );
  const [candidates, setCandidates] = useState([]);
  const [searchError, setSearchError] = useState(null);
  const [searchSummary, setSearchSummary] = useState(null);

  // Use passedQuery for display, fallback to "your query" or fetch from status
  const queryDisplay = useRef(passedQuery || "your query");

  const pollingTimerRef = useRef(null);
  const totalPollingTimeRef = useRef(0);

  // Update queryDisplay if it's not set and we get it from the status later
  useEffect(() => {
    if (passedQuery) {
      queryDisplay.current = passedQuery;
    }
  }, [passedQuery]);

  const pollForResults = (sId) => {
    // ... (pollForResults logic remains largely the same,
    // ensure it correctly handles data from /status endpoint)
    if (!sId) return;
    console.log(`SEARCH_RESULTS: Polling for results of searchId: ${sId}`);
    totalPollingTimeRef.current = 0;

    const poll = async () => {
      if (!isLoading && pollingTimerRef.current) {
        // Check isLoading state
        console.log("SEARCH_RESULTS: isLoading is false, stopping poll.");
        clearInterval(pollingTimerRef.current);
        return;
      }
      if (totalPollingTimeRef.current > MAX_POLL_DURATION) {
        console.error(
          "SEARCH_RESULTS: Max polling duration reached for search:",
          sId
        );
        setSearchError(
          "Search took too long and timed out. Please try again or check back later."
        );
        setLoadingMessage("Search timed out.");
        setIsLoading(false);
        clearInterval(pollingTimerRef.current);
        return;
      }

      try {
        const response = await axiosInstance.get(
          `/candidates/search/status/${sId}`
        );
        const data = response.data;
        console.log("SEARCH_RESULTS: Poll response data:", data);

        setLoadingProgress(data.progress || loadingProgress);
        setLoadingMessage(data.statusMessage || loadingMessage);
        if (queryDisplay.current === "your query" && data.query) {
          queryDisplay.current = data.query; // Update query if we didn't have it
        }

        totalPollingTimeRef.current += POLLING_INTERVAL;

        if (data.status === "pending" || data.status === "processing") {
          pollingTimerRef.current = setTimeout(poll, POLLING_INTERVAL);
        } else if (data.status === "completed") {
          setLoadingMessage("Search complete!");
          setLoadingProgress(100);
          clearInterval(pollingTimerRef.current);

          const finalCandidates =
            data.results?.finalResult || data.results?.candidates || [];
          setCandidates(finalCandidates);
          setSearchSummary(data.results?.summary || null);
          setTimeout(() => setIsLoading(false), 500);
        } else if (data.status === "failed") {
          console.error(
            "SEARCH_RESULTS: Search failed as per status API:",
            data.error
          );
          setSearchError(
            data.error ||
              data.statusMessage ||
              "An unknown error occurred during the search."
          );
          setLoadingMessage(`Error: ${data.statusMessage || "Search failed."}`);
          setIsLoading(false);
          clearInterval(pollingTimerRef.current);
        } else {
          console.warn(
            "SEARCH_RESULTS: Unknown search status received:",
            data.status,
            "Continuing poll."
          );
          pollingTimerRef.current = setTimeout(poll, POLLING_INTERVAL);
        }
      } catch (err) {
        console.error("SEARCH_RESULTS: Polling error:", err);
        if (err.response?.status === 404) {
          setSearchError(
            "Search ID not found. It might be invalid or expired."
          );
          setLoadingMessage("Error: Search not found.");
          setIsLoading(false);
          clearInterval(pollingTimerRef.current);
        } else {
          setLoadingMessage(
            "Connection issue while checking status, retrying..."
          );
          pollingTimerRef.current = setTimeout(poll, POLLING_INTERVAL * 1.5);
        }
      }
    };
    // Only start polling if we are still in a loading state
    if (isLoading) {
      poll();
    }
  };

  useEffect(() => {
    console.log(
      "SEARCH_RESULTS: useEffect triggered. paramSearchId:",
      paramSearchId
    );
    clearInterval(pollingTimerRef.current);
    setSearchError(null);

    if (paramSearchId) {
      setCurrentSearchId(paramSearchId);
      // If we have initialData from HomePage, use it. Otherwise, fetch fresh.
      // isLoading should already be true or set based on initialData.status
      if (
        passedInitialData &&
        (passedInitialData.status === "pending" ||
          passedInitialData.status === "processing")
      ) {
        console.log(
          "SEARCH_RESULTS: Has paramSearchId and initialData, starting poll."
        );
        setIsLoading(true); // Ensure loading is true if we start polling
        pollForResults(paramSearchId);
      } else if (
        passedInitialData &&
        passedInitialData.status === "completed"
      ) {
        console.log(
          "SEARCH_RESULTS: Has paramSearchId and initialData is 'completed'."
        );
        setLoadingMessage("Search complete!");
        setLoadingProgress(100);
        const finalCandidates =
          passedInitialData.results?.finalResult ||
          passedInitialData.results?.candidates ||
          [];
        setCandidates(finalCandidates);
        setSearchSummary(passedInitialData.results?.summary || null);
        setIsLoading(false);
      } else if (passedInitialData && passedInitialData.status === "failed") {
        console.log(
          "SEARCH_RESULTS: Has paramSearchId and initialData is 'failed'."
        );
        setSearchError(
          passedInitialData.error ||
            passedInitialData.statusMessage ||
            "Search failed."
        );
        setLoadingMessage(
          `Error: ${passedInitialData.statusMessage || "Search failed."}`
        );
        setIsLoading(false);
      } else {
        // No initial data from state, or it's an old link. Fetch status immediately.
        console.log(
          "SEARCH_RESULTS: Has paramSearchId but no valid initialData, fetching initial status."
        );
        setIsLoading(true);
        axiosInstance
          .get(`/candidates/search/status/${paramSearchId}`)
          .then((response) => {
            const data = response.data;
            if (queryDisplay.current === "your query" && data.query) {
              queryDisplay.current = data.query;
            }
            setLoadingProgress(data.progress || 0);
            setLoadingMessage(data.statusMessage || "Loading search status...");

            if (data.status === "completed") {
              // ... (handle completed)
              setLoadingMessage("Search complete!");
              setLoadingProgress(100);
              const finalCandidates =
                data.results?.finalResult || data.results?.candidates || [];
              setCandidates(finalCandidates);
              setSearchSummary(data.results?.summary || null);
              setIsLoading(false);
            } else if (data.status === "failed") {
              // ... (handle failed)
              setSearchError(
                data.error || data.statusMessage || "Search failed."
              );
              setLoadingMessage(
                `Error: ${data.statusMessage || "Search failed."}`
              );
              setIsLoading(false);
            } else {
              // pending or processing
              pollForResults(paramSearchId);
            }
          })
          .catch((err) => {
            console.error(
              "SEARCH_RESULTS: Error fetching initial status for existing search:",
              err
            );
            if (err.response?.status === 404) {
              setSearchError(
                "Search ID not found. It might be an invalid or old link."
              );
              setLoadingMessage("Error: Search not found.");
            } else {
              setSearchError(
                "Could not load search status. Please check your connection."
              );
              setLoadingMessage("Error loading search.");
            }
            setIsLoading(false);
          });
      }
    } else if (location.state?.query && !paramSearchId) {
      // This case should ideally not happen if HomePage always makes the POST.
      // This means user navigated to SearchResults directly with a query in state but no searchId.
      // For robustness, we could initiate a search here, but it's better if HomePage handles it.
      console.warn(
        "SEARCH_RESULTS: Navigated with query in state but no paramSearchId. This flow should be initiated from HomePage."
      );
      setSearchError(
        "Search not properly initiated. Please start a new search."
      );
      setIsLoading(false);
    } else {
      console.log("SEARCH_RESULTS: No paramSearchId and no query in state.");
      setIsLoading(false);
      setLoadingMessage("");
      setSearchError("No search active. Please start a new search.");
    }

    return () => {
      console.log(
        "SEARCH_RESULTS: Cleanup function called, clearing polling timer."
      );
      clearInterval(pollingTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramSearchId, location.state]); // location.state is complex, consider more specific deps if needed
  // or location.key to re-run on navigation.
  // Using `location.state` ensures it re-evaluates if state changes.

  // ... (rest of SearchResults component: handleNewSearch, JSX)
  const handleNewSearch = () => {
    navigate("/search"); // Your search form page
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center max-w-xl w-full px-4">
            <div className="flex justify-center mb-6">
              <svg // Your spinner SVG
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-blue-600 animate-spin"
              >
                <path d="M12 2v4" />
                <path d="m16.2 7.8 2.9-2.9" />
                <path d="M18 12h4" />
                <path d="m16.2 16.2 2.9 2.9" />
                <path d="M12 18v4" />
                <path d="m4.9 19.1 2.9-2.9" />
                <path d="M2 12h4" />
                <path d="m4.9 4.9 2.9 2.9" />
              </svg>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4 dark:bg-gray-700">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            <p className="text-lg font-medium text-gray-800 mb-3">
              {loadingMessage}
            </p>
            {queryDisplay.current && queryDisplay.current !== "your query" && (
              <p className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full inline-block">
                Query: "{queryDisplay.current}"
              </p>
            )}
            {currentSearchId && (
              <p className="text-xs text-gray-400 mt-2">
                Search ID: {currentSearchId}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl flex flex-col mx-auto pt-10 p-6">
        <div className="mb-6">
          <div className="flex gap-4 items-center justify-between mb-4">
            {" "}
            {/* Changed items-between */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Search Results
              </h1>
              {queryDisplay.current &&
                queryDisplay.current !== "your query" && (
                  <p className="text-gray-600 text-sm mt-1">
                    For query: "{queryDisplay.current}"
                  </p>
                )}
              {searchSummary && (
                <p className="text-gray-500 text-xs mt-1 italic">
                  {searchSummary}
                </p>
              )}
            </div>
            <button
              onClick={handleNewSearch}
              className="bg-black h-fit cursor-pointer text-white px-4 py-2 text-sm font-medium rounded-full hover:bg-gray-800 transition"
            >
              New Search
            </button>
          </div>
        </div>

        {searchError && (
          <div
            className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg"
            role="alert"
          >
            <span className="font-medium">Error:</span> {searchError}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {candidates.length > 0 ? (
            candidates.map((candidate, index) => (
              <TalentRow
                key={
                  candidate.public_identifier ||
                  candidate.id ||
                  candidate.url ||
                  `candidate-${index}`
                }
                talent={candidate}
              />
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>
                {searchError
                  ? "Could not display results due to an error."
                  : "No candidates found for this search."}
              </p>
              <button
                onClick={handleNewSearch}
                className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
              >
                Try a new search
              </button>
            </div>
          )}
        </div>

        {candidates.length > 0 && (
          <div className="flex mt-6 ml-auto gap-4 text-sm text-gray-600">
            <span>
              Found {candidates.length} candidate
              {candidates.length === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
