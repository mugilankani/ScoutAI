import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import Navbar from "./Navbar";

const PersonProfile = () => {
  const { personId } = useParams();
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call to fetch person details
    const fetchPersonProfile = async () => {
      setIsLoading(true);

      // Mock API call - replace with actual endpoint
      setTimeout(() => {
        const mockPerson = {
          id: personId,
          name: "Sarah Chen",
          title: "Senior React Developer",
          location: "San Francisco, CA",
          experience: "6 years",
          email: "sarah.chen@email.com",
          phone: "+1 (555) 123-4567",
          skills: [
            "React",
            "TypeScript",
            "Node.js",
            "GraphQL",
            "AWS",
            "Docker",
            "Kubernetes",
            "PostgreSQL",
          ],
          avatar:
            "https://ui-avatars.com/api/?name=Sarah+Chen&background=6366f1&color=fff&size=200",
          summary:
            "Experienced React developer with a strong background in fintech applications. Led multiple teams and delivered high-impact products. Passionate about building scalable web applications and mentoring junior developers.",
          linkedin: "https://linkedin.com/in/sarahchen",
          github: "https://github.com/sarahchen",
          portfolio: "https://sarahchen.dev",
          matchScore: 95,
          experience_details: [
            {
              company: "TechCorp Inc.",
              position: "Senior Frontend Developer",
              duration: "2022 - Present",
              description:
                "Lead a team of 5 developers building fintech applications. Implemented micro-frontend architecture resulting in 40% faster deployment cycles.",
            },
            {
              company: "StartupXYZ",
              position: "Full Stack Developer",
              duration: "2020 - 2022",
              description:
                "Built end-to-end web applications using React, Node.js, and PostgreSQL. Improved application performance by 60% through optimization techniques.",
            },
            {
              company: "WebDev Agency",
              position: "Frontend Developer",
              duration: "2018 - 2020",
              description:
                "Developed responsive web applications for various clients. Specialized in React and modern CSS frameworks.",
            },
          ],
          education: [
            {
              institution: "Stanford University",
              degree: "BS Computer Science",
              year: "2018",
            },
          ],
        };

        setPerson(mockPerson);
        setIsLoading(false);
      }, 800);
    };

    fetchPersonProfile();
  }, [personId]);

  const handleContactClick = async () => {
    // Mock API call to initiate contact
    try {
      console.log(`Initiating contact with person ${personId}`);
      alert(
        "Contact request sent! You'll receive their contact details via email."
      );
    } catch (error) {
      console.error("Failed to contact person:", error);
    }
  };

  const handleBackToResults = () => {
    navigate(-1); // Go back to previous page (search results)
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <svg
              className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Person not found</p>
            <button
              onClick={handleBackToResults}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back Button */}
        <button
          onClick={handleBackToResults}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Results
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8 text-white">
            <div className="flex items-start gap-6">
              <img
                src={person.avatar}
                alt={person.name}
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
              />
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{person.name}</h1>
                <p className="text-xl opacity-90 mb-2">{person.title}</p>
                <p className="opacity-75 mb-4">
                  {person.location} • {person.experience}
                </p>
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                    {person.matchScore}% Match
                  </span>
                </div>
              </div>
              <button
                onClick={handleContactClick}
                className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Contact
              </button>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-6">
            {/* Summary */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3 text-gray-900">
                About
              </h2>
              <p className="text-gray-700 leading-relaxed">{person.summary}</p>
            </section>

            {/* Skills */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3 text-gray-900">
                Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {person.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>

            {/* Experience */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">
                Experience
              </h2>
              <div className="space-y-4">
                {person.experience_details.map((exp, index) => (
                  <div
                    key={index}
                    className="border-l-2 border-blue-200 pl-4 pb-4"
                  >
                    <h3 className="font-semibold text-gray-900">
                      {exp.position}
                    </h3>
                    <p className="text-blue-600 font-medium">{exp.company}</p>
                    <p className="text-sm text-gray-500 mb-2">{exp.duration}</p>
                    <p className="text-gray-700">{exp.description}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Education */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3 text-gray-900">
                Education
              </h2>
              {person.education.map((edu, index) => (
                <div key={index} className="border-l-2 border-green-200 pl-4">
                  <h3 className="font-semibold text-gray-900">{edu.degree}</h3>
                  <p className="text-green-600 font-medium">
                    {edu.institution}
                  </p>
                  <p className="text-sm text-gray-500">{edu.year}</p>
                </div>
              ))}
            </section>

            {/* Links */}
            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-900">
                Links
              </h2>
              <div className="flex gap-4">
                <a
                  href={person.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn
                </a>
                <a
                  href={person.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-800 hover:text-black transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  GitHub
                </a>
                {person.portfolio && (
                  <a
                    href={person.portfolio}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-purple-600 hover:text-purple-800 transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    Portfolio
                  </a>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonProfile;
