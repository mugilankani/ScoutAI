import { useState } from "react";
import { useNavigate } from "react-router";

export default function TalentRow({ talent }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  // Extract name from either the finalResult format or raw LinkedIn format
  const getName = () => {
    if (talent.personalInfo?.fullName) return talent.personalInfo.fullName;

    if (talent.personalInfo?.firstName && talent.personalInfo?.lastName) {
      return `${talent.personalInfo.firstName} ${talent.personalInfo.lastName}`;
    }

    if (typeof talent.name === "string") return talent.name;

    // Handle the case where name might be an object
    if (typeof talent.name === "object") {
      return JSON.stringify(talent.name).substring(0, 30);
    }

    return "Unknown";
  };

  // Extract name safely
  const name = getName();

  // Extract current job title - handle object case
  const title =
    typeof talent.currentRole?.title === "object"
      ? JSON.stringify(talent.currentRole?.title)
      : talent.currentRole?.title ||
        talent.personalInfo?.headline ||
        talent.title ||
        "";

  // Extract location safely
  const location =
    talent.location?.city && talent.location?.country
      ? `${talent.location.city}, ${talent.location.country}`
      : typeof talent.location === "string"
      ? talent.location
      : "";

  // Extract experience safely
  const experience = talent.currentRole?.durationInMonths
    ? `${Math.floor(talent.currentRole.durationInMonths / 12)} years`
    : typeof talent.experience === "string"
    ? talent.experience
    : "";

  // Extract skills - handle different formats and ensure they're strings
  const skills = Array.isArray(talent.skills)
    ? talent.skills.slice(0, 5).map((skill) => {
        if (typeof skill === "object")
          return skill.name || JSON.stringify(skill);
        return String(skill);
      })
    : [];

  // Extract avatar/profile picture safely
  const avatar =
    talent.socialInfo?.profilePicture?.url ||
    (typeof talent.avatar === "string" ? talent.avatar : "") ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=6366f1&color=fff`;

  // Extract summary safely
  const summary =
    typeof talent.personalInfo?.about === "string"
      ? talent.personalInfo?.about
      : typeof talent.summary === "string"
      ? talent.summary
      : "";

  // Extract LinkedIn safely
  const linkedin =
    typeof talent.socialInfo?.linkedinUrl === "string"
      ? talent.socialInfo.linkedinUrl
      : typeof talent.linkedin === "string"
      ? talent.linkedin
      : "";

  // For now, GitHub may not be in the response
  const github = typeof talent.github === "string" ? talent.github : "";

  // Extract match score safely
  const matchScore = talent.scoring?.score
    ? Math.round(talent.scoring.score * 10)
    : talent.matchScore || 0;

  // Create a unique ID for navigation
  const id =
    talent.personalInfo?.publicIdentifier ||
    talent.fingerPrint ||
    talent.id ||
    encodeURIComponent(name);

  const handleProfileClick = (e) => {
    e.stopPropagation();
    navigate(`/p/${id}`, { state: { talent } });
  };

  return (
    <div className="w-full border-b border-gray-200 last:border-0 transition-all">
      {/* Condensed Row */}
      <div
        className="px-4 py-3 flex items-center justify-between hover:bg-neutral-50 cursor-pointer"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-3">
          <img
            src={avatar}
            alt={name}
            className="h-8 w-8 rounded-full object-cover"
          />
          <div className="flex flex-col">
            <p className="font-medium text-sm">{name}</p>
            <p className="text-xs text-gray-500">{title}</p>
          </div>
        </div>
        {matchScore > 0 && (
          <span className="text-xs font-semibold text-green-600">
            {matchScore}% Match
          </span>
        )}
      </div>

      {/* Expanded Card */}
      {expanded && (
        <div className="px-4 pb-4 border-t mx-3 mb-3 pt-4 bg-white transition-all">
          {(location || experience) && (
            <p className="text-xs text-gray-500">
              {location}
              {location && experience && " • "}
              {experience}
            </p>
          )}
          {summary && <p className="mt-2 text-sm text-gray-700">{summary}</p>}
          <div className="flex gap-2 mt-3 justify-between">
            <div className="flex flex-wrap gap-1">
              {skills.map((skill, index) => (
                <span
                  key={index}
                  className="text-xs border !border-neutral-400 px-2 leading-5 py-[1.5px] flex rounded"
                >
                  {skill}
                </span>
              ))}
            </div>
            <div className="flex gap-1 text-sm">
              <button
                onClick={handleProfileClick}
                className="bg-blue-600 text-white px-3 py-1 cursor-pointer rounded hover:bg-blue-700 transition-colors text-xs font-medium"
              >
                View Profile
              </button>
              {linkedin && (
                <a
                  href={
                    linkedin.startsWith("http")
                      ? linkedin
                      : `https://${linkedin}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center font-medium gap-1 hover:underline hover:bg-blue-50 px-2 text-blue-600"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3"
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  LinkedIn
                </a>
              )}
              {github && (
                <a
                  href={
                    github.startsWith("http") ? github : `https://${github}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center font-medium gap-1 hover:underline hover:bg-blue-50 px-2 text-blue-600"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3"
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  GitHub
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
