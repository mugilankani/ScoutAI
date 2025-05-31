import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";

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

      // Mock data - replace with actual API call
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
        ];

        setCandidates(mockCandidates);
        setIsLoading(false);
      }, 1000);
    };

    fetchResults();
  }, [searchId]);

  const handleProfileClick = () => {
    navigate("/profile");
  };

  const handleNewSearch = () => {
    navigate("/chat");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-900 px-4 py-6">
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
          className="animate-spin text-black mb-4"
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

        <p className="text-lg font-medium">
          Searching across the web for the best talent...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-neutral-50 text-gray-900 px-4 py-6">
      <div className="border rounded-2xl bg-white m-auto overflow-hidden w-full max-w-3xl">
        <TalentRow talent={candidates[1]} />
        <TalentRow talent={candidates[1]} />
        <TalentRow talent={candidates[1]} />
        <TalentRow talent={candidates[1]} />
        <TalentRow talent={candidates[1]} />
      </div>
    </div>
  );
};

export default SearchResults;
