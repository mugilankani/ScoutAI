// src/components/HomePage.js
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../axios";
import Navbar from "./Navbar";
import { useAuth } from "../context/AuthContext"; // Assuming you have this for user ID

const EXAMPLES = [
  "Find senior GenAI engineers with LangChain + RAG experience, open to contract work in Europe",
  "Show me full-stack developers available for freelance projects with React and Node.js expertise",
  "Find product designers with fintech experience open to remote roles in the US timezone",
];

const HomePage = () => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false); // For the main "Send" action
  const [improvementLoading, setImprovementLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [improvedPrompt, setImprovedPrompt] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  // const [userId, setUserId] = useState(null); // Get from useAuth context
  const { user } = useAuth(); // Use the user object from context
  const navigate = useNavigate();
  // const authCheckedRef = useRef(false); // No longer needed if useAuth handles user state

  // useEffect for current user is fine if useAuth doesn't immediately provide user
  // but typically useAuth would manage the user state.

  const handleExampleClick = (text) => {
    setInput(text);
    setSuggestions([]);
    setImprovedPrompt("");
    setShowSuggestions(false);
  };

  const handleImprove = async () => {
    // ... (handleImprove logic remains the same)
    if (!input.trim()) return;

    setImprovementLoading(true);
    setSuggestions([]);
    setImprovedPrompt("");

    try {
      console.log("Calling suggestions API...");
      const response = await axiosInstance.post("/suggestions/improve", {
        prompt: input,
      });
      console.log("Improvement API response:", response.data);
      if (response.data && response.data.suggestions) {
        setSuggestions(response.data.suggestions);
        setImprovedPrompt(response.data.improvedPrompt || "");
        setShowSuggestions(true);
      } else {
        throw new Error("Invalid response format from suggestions API");
      }
    } catch (err) {
      console.error("Failed to get prompt improvements:", err);
      setSuggestions([
        "Specify years of experience required",
        "Include specific technologies or frameworks",
      ]);
      setImprovedPrompt(
        `Looking for ${input} with specific skills. Location: remote.`
      );
      setShowSuggestions(true);
    } finally {
      setImprovementLoading(false);
    }
  };

  const handleSend = async (messageToSend = input) => {
    if (!messageToSend.trim()) return;

    setLoading(true);
    console.log("HOMEPAGE: handleSend called with query:", messageToSend);
    try {
      const payload = {
        recruiterQuery: messageToSend,
        filterPresent: false, // Or get from UI if you add a filter option
      };
      
      // Fix the user ID capture to ensure it's properly included
      if (user) {
        // Ensure user ID is correctly passed
        payload.userId = user.uid || user.id;
        console.log("HOMEPAGE: Including user ID in request:", payload.userId);
      } else {
        console.warn("HOMEPAGE: No user object available - search will be anonymous");
      }

      console.log("HOMEPAGE: Making POST /api/candidates/search with payload:", payload);
      // *** THIS IS THE CRUCIAL API CALL TO INITIATE THE SEARCH ON THE BACKEND ***
      const response = await axiosInstance.post("/candidates/search", payload);
      console.log("HOMEPAGE: Received response from POST /api/candidates/search:", response);

      if (response.status === 202 && response.data.searchId) {
        const serverGeneratedSearchId = response.data.searchId;
        const initialDataFromServer = response.data.initialData; // Progress, statusMessage etc.

        console.log(`HOMEPAGE: Search initiated successfully by backend. Server Search ID: ${serverGeneratedSearchId}`);
        // FIX: Change the route to match the one in App.jsx (/s/:searchId instead of /search-results/:searchId)
        navigate(`/s/${serverGeneratedSearchId}`, {
          state: {
            query: messageToSend, // The original query for display
            initialData: initialDataFromServer, // Pass initial status data
            // filterPresent: payload.filterPresent // if you pass it
          },
        });
      } else {
        // Handle unexpected success response (e.g., 200 OK but no searchId)
        console.error("HOMEPAGE: Unexpected response from search initiation:", response);
        alert(`Error: Could not start search. Server responded with status ${response.status}.`);
        setLoading(false);
      }
    } catch (err) {
      console.error("HOMEPAGE: Error calling POST /api/candidates/search or navigating:", err);
      if (err.response) {
        console.error("HOMEPAGE: Error response data:", err.response.data);
        alert(`Error starting search: ${err.response.data.error || err.message}`);
      } else {
        alert(`Error starting search: ${err.message}`);
      }
      setLoading(false);
    }
    // setLoading(false) will be handled by navigation or error
  };

  const applyImprovedPrompt = () => {
    if (improvedPrompt) {
      setInput(improvedPrompt);
      setShowSuggestions(false);
    }
  };

  // Ensure your Route for SearchResults is like: <Route path="/search-results/:searchId" element={<SearchResults />} />
  // If your current route is /s/:searchId, change the navigate call above to navigate(`/s/${serverGeneratedSearchId}`, ...

  return (
    // ... (rest of your HomePage JSX remains the same)
    <div className="min-h-screen">
      <Navbar />
      <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-between text-gray-900 px-4 py-6">
        {/* Top Section */}
        <div className="flex-grow flex flex-col items-center justify-center gap-16 max-w-4xl">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-6">
              <h1 className="text-3xl font-serif font-bold">
                What kinda talent are you looking for?
              </h1>
              <p className="text-gray-600 mt-2">
                Effortlessly find top talent for your team
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {EXAMPLES.map((example, i) => (
                <button
                  key={i}
                  className="border text-sm cursor-pointer border-neutral-200 rounded-xl px-5 py-4 hover:bg-neutral-50 bg-neutral-100 transition"
                  onClick={() => handleExampleClick(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Input Section */}
          <div className="w-full max-w-2xl">
            <div className="flex items-center rounded-3xl bg-white p-3 border border-gray-300 outline-8 !outline-gray-100 focus-within:!outline-blue-100 focus-within:!border-blue-300">
              <textarea
                className="flex-grow pl-2 pt-1 outline-none resize-none h-16"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault(); // Prevent default newline on Enter
                    handleSend();
                  }
                }}
                disabled={loading || improvementLoading}
              />
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={handleImprove}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 text-sm font-medium rounded-full flex items-center gap-1 transition-colors"
                  disabled={loading || improvementLoading || !input.trim()}
                >
                  {improvementLoading ? (
                    <span className="inline-block h-4 w-4 border-t-2 border-gray-600 rounded-full animate-spin mr-1"></span>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m18 16 4-4-4-4" />
                      <path d="m6 8-4 4 4 4" />
                      <path d="m14.5 4-5 16" />
                    </svg>
                  )}
                  Improve
                </button>
                <button
                  onClick={() => handleSend()}
                  className="bg-black text-white px-4 py-1.5 text-sm font-medium rounded-full flex items-center"
                  disabled={loading || improvementLoading || !input.trim()}
                >
                  {loading && (
                    <span className="inline-block h-4 w-4 border-t-2 border-white rounded-full animate-spin mr-2"></span>
                  )}
                  Send
                </button>
              </div>
            </div>

            {/* Suggestions Panel */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h3 className="font-medium text-gray-800 mb-2">
                  Suggestions to improve your prompt:
                </h3>
                <ul className="list-disc pl-5 mb-4 space-y-1">
                  {suggestions.map((suggestion, i) => (
                    <li key={i} className="text-sm text-gray-700">
                      {suggestion}
                    </li>
                  ))}
                </ul>
                {improvedPrompt && (
                  <>
                    <h3 className="font-medium text-gray-800 mb-2">
                      Improved prompt:
                    </h3>
                    <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 mb-3">
                      {improvedPrompt}
                    </div>
                    <button
                      onClick={applyImprovedPrompt}
                      className="text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-1.5 px-3 rounded"
                    >
                      Use this prompt
                    </button>
                  </>
                )}
              </div>
            )}

            <p className="text-xs mt-8 text-center text-gray-600">
              *Ensure candidate info matches your requirements before reaching
              out
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;