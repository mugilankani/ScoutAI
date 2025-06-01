import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";
import TalentRow from "./TalentRow";

const SearchResults = () => {
  const { searchId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const searchQuery = location.state?.query || "";

  useEffect(() => {
    // Simulate API call to fetch search results
    const fetchResults = async () => {
      setIsLoading(true);

      try {
        // Mock API call - replace with actual endpoint
        console.log(`Fetching results for search ID: ${searchId}`);

        setTimeout(() => {
          const mockCandidates = [
            {
              id: 1,
              name: "Sarah Chen",
              title: "Senior React Developer",
              location: "San Francisco, CA",
              experience: "6 years",
              skills: ["React", "TypeScript", "Node.js", "GraphQL", "AWS"],
              avatar:
                "https://ui-avatars.com/api/?name=Sarah+Chen&background=6366f1&color=fff",
              summary:
                "Experienced React developer with a strong background in fintech applications. Led multiple teams and delivered high-impact products.",
              linkedin: "https://linkedin.com/in/sarahchen",
              github: "https://github.com/sarahchen",
              matchScore: 95,
            },
            {
              id: 2,
              name: "Alex Rodriguez",
              title: "Full Stack Engineer",
              location: "Remote",
              experience: "5 years",
              skills: ["React", "TypeScript", "Python", "Docker", "Kubernetes"],
              avatar:
                "https://ui-avatars.com/api/?name=Alex+Rodriguez&background=10b981&color=fff",
              summary:
                "Versatile full-stack engineer with expertise in modern web technologies and DevOps practices. Strong problem-solving skills.",
              linkedin: "https://linkedin.com/in/alexrodriguez",
              github: "https://github.com/alexrodriguez",
              matchScore: 88,
            },
            {
              id: 3,
              name: "Emily Johnson",
              title: "Frontend Developer",
              location: "Austin, TX",
              experience: "4 years",
              skills: ["React", "JavaScript", "CSS", "Firebase", "Next.js"],
              avatar:
                "https://ui-avatars.com/api/?name=Emily+Johnson&background=f59e0b&color=fff",
              summary:
                "Creative frontend developer with a passion for user experience. Specialized in building responsive and accessible web applications.",
              linkedin: "https://linkedin.com/in/emilyjohnson",
              github: "https://github.com/emilyjohnson",
              matchScore: 82,
            },
            {
              id: 4,
              name: "David Kim",
              title: "React Native Developer",
              location: "Seattle, WA",
              experience: "7 years",
              skills: [
                "React",
                "React Native",
                "TypeScript",
                "Redux",
                "Firebase",
              ],
              avatar:
                "https://ui-avatars.com/api/?name=David+Kim&background=8b5cf6&color=fff",
              summary:
                "Mobile-focused React developer with extensive experience in cross-platform app development. Strong background in startup environments.",
              linkedin: "https://linkedin.com/in/davidkim",
              github: "https://github.com/davidkim",
              matchScore: 90,
            },
            {
              id: 5,
              name: "Maria Garcia",
              title: "Senior Frontend Engineer",
              location: "New York, NY",
              experience: "8 years",
              skills: ["React", "Vue.js", "TypeScript", "Node.js", "MongoDB"],
              avatar:
                "https://ui-avatars.com/api/?name=Maria+Garcia&background=ef4444&color=fff",
              summary:
                "Senior frontend engineer with deep expertise in modern JavaScript frameworks. Expert in performance optimization and scalable architecture.",
              linkedin: "https://linkedin.com/in/mariagarcia",
              github: "https://github.com/mariagarcia",
              matchScore: 92,
            },
          ];

          setCandidates(mockCandidates);
          setIsLoading(false);
        }, 1500);
      } catch (error) {
        console.error("Failed to fetch search results:", error);
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [searchId]);

  const handleNewSearch = () => {
    navigate("/search");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />{" "}
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <svg
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
            <div className="space-y-3">
              <p className="text-lg font-medium text-gray-800">
                Searching across the web for the best talent...
              </p>
              {searchQuery && (
                <p className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full inline-block">
                  Query: "{searchQuery}"
                </p>
              )}
            </div>
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
          <div className="flex gap-4 items-between justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Search Results
              </h1>
              {searchQuery && (
                <p className="text-gray-600 text-sm mt-1">
                  Results for: "{searchQuery}"
                </p>
              )}
            </div>
            <button
              onClick={handleNewSearch}
              className="bg-black m-auto w-32 h-fit cursor-pointer text-white px-4 py-2 text-sm font-medium rounded-full hover:bg-gray-800 transition"
            >
              New Search
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {candidates.length > 0 ? (
            candidates.map((candidate) => (
              <TalentRow key={candidate.id} talent={candidate} />
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>No candidates found for this search.</p>
              <button
                onClick={handleNewSearch}
                className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
              >
                Try a new search
              </button>
            </div>
          )}
        </div>
        <div className="flex mt-6 ml-auto gap-4 text-sm text-gray-600">
          <span>Found {candidates.length} candidates</span>
        </div>
      </div>
    </div>
  );
};

export default SearchResults;
