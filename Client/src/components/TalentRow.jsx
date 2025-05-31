import { useState } from "react";

export default function TalentRow({ talent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-full border-b border-gray-200 last:border-0 transition-all">
      {/* Condensed Row */}
      <div
        className="px-4 py-3 flex items-center justify-between hover:bg-neutral-50 cursor-pointer"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-3">
          <img
            src={talent.avatar}
            alt={talent.name}
            className="h-8 w-8 rounded-full"
          />
          <div className="flex flex-col">
            <p className="font-medium text-sm">{talent.name}</p>
            <p className="text-xs text-gray-500">{talent.title}</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-green-600">
          {talent.matchScore}% Match
        </span>
      </div>

      {/* Expanded Card */}
      {expanded && (
        <div className="px-4 pb-4 border-t mx-3 mb-3 pt-4 bg-white transition-all">
          <p className="text-xs text-gray-500">
            {talent.location} • {talent.experience}
          </p>
          <p className="mt-2 text-sm text-gray-700">{talent.summary}</p>
          <div className="flex gap-2 mt-3 justify-between">
            <div className="flex flex-wrap gap-1">
              {talent.skills.map((skill, index) => (
                <span
                  key={index}
                  className="text-xs border !border-neutral-400 px-2 leading-5 py-[1.5px] flex rounded"
                >
                  {skill}
                </span>
              ))}
            </div>
            <div className="flex gap-1 text-sm text-blue-600">
              <a
                href={talent.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center font-medium gap-1 hover:underline hover:bg-blue-50 px-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="h-3 w-3"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                LinkedIn
              </a>
              <a
                href={talent.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center font-medium gap-1 hover:underline hover:bg-blue-50 px-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="h-3 w-3"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                GitHub
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
