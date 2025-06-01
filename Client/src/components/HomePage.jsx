import { useState } from "react";
import { useNavigate } from "react-router";
import axiosInstance from "../axios";
import Navbar from "./Navbar";

const EXAMPLES = [
  "Find senior GenAI engineers with LangChain + RAG experience, open to contract work in Europe",
  "Show me full-stack developers available for freelance projects with React and Node.js expertise",
  "Find product designers with fintech experience open to remote roles in the US timezone",
];

const HomePage = () => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleExampleClick = (text) => {
    setInput(text);
  };
  const handleSend = async (message = input) => {
    if (!message.trim()) return;

    setLoading(true);
    try {
      // Generate a unique search ID
      const searchId = Date.now().toString();
      
      // Make API call to initiate search
      const response = await axiosInstance.post("/api/search", {
        query: message,
        searchId: searchId,
      });
      
      console.log("Search initiated:", response.data);
      
      // Navigate to search results with the search ID and query
      navigate(`/s/${searchId}`, { 
        state: { query: message } 
      });
      
    } catch (err) {
      console.error("Search failed", err);
      // For demo purposes, still navigate to show mock results
      const searchId = Date.now().toString();
      navigate(`/s/${searchId}`, { 
        state: { query: message } 
      });
    }
    setLoading(false);
    setInput("");
  };
  return (
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
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleSend()
                }
                disabled={loading}
              />
              <button
                onClick={() => handleSend()}
                className="bg-black mt-auto text-white px-4 cursor-pointer py-1.5 text-sm font-medium rounded-full"
                disabled={loading}
              >
                Send
              </button>
            </div>{" "}
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
