import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Navbar from "./Navbar";

const PersonProfile = () => {
  const { personId } = useParams();
  const navigate = useNavigate();
  const routerLocation = useLocation(); // Renamed from 'location' to 'routerLocation'
  
  // Get talent directly from state if available (passed from TalentRow)
  const [person, setPerson] = useState(routerLocation.state?.talent || null);
  const [isLoading, setIsLoading] = useState(!routerLocation.state?.talent);

  useEffect(() => {
    // If we already have the person data from state, skip the fetch
    if (person) {
      setIsLoading(false);
      return;
    }
    
    // Otherwise fetch the profile data
    const fetchPersonProfile = async () => {
      setIsLoading(true);
      try {
        // Attempt to fetch the profile from API
        const response = await fetch(`/api/profiles/${personId}`);
        if (response.ok) {
          const data = await response.json();
          setPerson(data);
        } else {
          console.error("Failed to fetch profile data");
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPersonProfile();
  }, [personId, person]);

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

  // Extract all the fields with fallbacks
  const getName = () => {
    if (person.personalInfo?.fullName) return person.personalInfo.fullName;
    
    if (person.personalInfo?.firstName && person.personalInfo?.lastName) {
      return `${person.personalInfo.firstName} ${person.personalInfo.lastName}`;
    }
    
    if (typeof person.name === 'string') return person.name;
    
    if (typeof person.name === 'object') {
      return JSON.stringify(person.name);
    }
    
    return "Unknown";
  };
  
  const name = getName();
  
  // Extract job title
  const title = typeof person.currentRole?.title === 'string' ? 
                person.currentRole.title : 
                (typeof person.personalInfo?.headline === 'string' ? 
                 person.personalInfo.headline : 
                 (typeof person.title === 'string' ? person.title : ""));
  
  // Extract location
  const locationStr = person.location?.city && person.location?.country ? 
                  `${person.location.city}, ${person.location.country}` : 
                  (typeof person.location === 'string' ? person.location : "");
  
  // Extract experience
  const experience = person.currentRole?.durationInMonths ? 
                    `${Math.floor(person.currentRole.durationInMonths / 12)} years` : 
                    (typeof person.experience === 'string' ? person.experience : "");
  
  // Process skills
  const skills = Array.isArray(person.skills) ? 
                person.skills.map(skill => {
                  if (typeof skill === 'object') {
                    return {
                      name: skill.name || "",
                      endorsementCount: skill.endorsementCount || 0
                    };
                  }
                  return { name: String(skill), endorsementCount: 0 };
                }).sort((a, b) => b.endorsementCount - a.endorsementCount) : // Sort by endorsement count
                [];
  
  // Extract avatar/profile picture
  const avatar = person.socialInfo?.profilePicture?.large || 
                person.socialInfo?.profilePicture?.medium || 
                person.socialInfo?.profilePicture?.url ||
                person.avatar || 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=200`;
  
  // Extract summary/about
  const summary = typeof person.personalInfo?.about === 'string' ? 
                 person.personalInfo.about : 
                 (typeof person.summary === 'string' ? person.summary : "");
  
  // Extract social links
  const linkedin = typeof person.socialInfo?.linkedinUrl === 'string' ? 
                  person.socialInfo.linkedinUrl : 
                  (typeof person.linkedin === 'string' ? person.linkedin : "");
  
  const github = typeof person.github === 'string' ? person.github : "";
  
  const website = typeof person.contactInfo?.website === 'string' ? 
                 person.contactInfo.website : 
                 (typeof person.portfolio === 'string' ? person.portfolio : "");
  
  // Extract connections/followers
  const connections = person.socialInfo?.connectionsCount || 0;
  const followers = person.socialInfo?.followersCount || 0;
  
  // Extract match score
  const matchScore = person.scoring?.score ? 
                    Math.round(person.scoring.score * 10) : 
                    person.matchScore || 0;
  
  // Extract languages
  const languages = Array.isArray(person.languages) ? 
                  person.languages.map(lang => typeof lang === 'object' ? lang.name : lang) : 
                  [];
  
  // Format experiences
  const experienceDetails = [];
  if (Array.isArray(person.experiences)) {
    person.experiences.forEach(exp => {
      const company = typeof exp.companyName === 'string' ? exp.companyName : 
                    (typeof exp.company?.name === 'string' ? exp.company.name : 
                     (typeof exp.company === 'string' ? exp.company : 
                      (typeof exp.company === 'object' ? JSON.stringify(exp.company) : "")));
                      
      const position = typeof exp.title === 'string' ? exp.title : "";
      
      const startYear = exp.startDate && typeof exp.startDate === 'string' ? exp.startDate.substring(0, 4) : "";
      const endYear = exp.endDate === "Present" ? "Present" : 
                    (exp.endDate && typeof exp.endDate === 'string' ? exp.endDate.substring(0, 4) : "");
      const duration = `${startYear}${startYear && endYear ? " - " : ""}${endYear}`;
      
      const description = typeof exp.description === 'string' ? exp.description : "";
      
      experienceDetails.push({
        company,
        position,
        duration,
        description,
        startDate: exp.startDate,
        endDate: exp.endDate
      });
    });
    // Sort experiences by start date (newest first)
    experienceDetails.sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate) : new Date(0);
      const dateB = b.startDate ? new Date(b.startDate) : new Date(0);
      return dateB - dateA;
    });
  } else if (Array.isArray(person.experience_details)) {
    experienceDetails.push(...person.experience_details);
  }
  
  // Format education
  const educationDetails = [];
  if (Array.isArray(person.education)) {
    person.education.forEach(edu => {
      const institution = typeof edu.schoolName === 'string' ? edu.schoolName : 
                       (typeof edu.institution === 'string' ? edu.institution : "");
                       
      const degree = typeof edu.degreeName === 'string' ? edu.degreeName : 
                   (typeof edu.degree === 'string' ? edu.degree : 
                    (typeof edu.fieldOfStudy === 'string' ? edu.fieldOfStudy : ""));
                    
      const startYear = edu.startDate && typeof edu.startDate === 'string' ? edu.startDate.substring(0, 4) : "";
      const endYear = edu.endDate && typeof edu.endDate === 'string' ? edu.endDate.substring(0, 4) : "";
      const year = startYear || endYear ? `${startYear || ""}${startYear && endYear ? " - " : ""}${endYear || ""}` : 
                 (typeof edu.dateRange === 'string' ? edu.dateRange : 
                  (typeof edu.year === 'string' ? edu.year : ""));
                 
      educationDetails.push({
        institution,
        degree,
        year
      });
    });
  } else if (Array.isArray(person.education_details)) {
    educationDetails.push(...person.education_details);
  }
  
  // Extract certifications
  const certifications = Array.isArray(person.certifications) ? 
                       person.certifications.map(cert => ({
                         name: cert.name || "",
                         authority: cert.authority || "",
                         date: cert.date || cert.startDate || ""
                       })) : [];
  
  // Extract key sections we want to highlight
  const extractPrescreening = () => {
    // Handle case where prescreening is in standard format
    if (Array.isArray(person.prescreening?.questions)) {
      return person.prescreening.questions.map((q, i) => {
        // If q is already an object with question/answer properties
        if (typeof q === 'object' && q !== null && q.question) {
          return q;
        }
        // If q is a string, create a question object with empty answer
        if (typeof q === 'string') {
          return {
            question: q,
            answer: "" // No answer in the raw data format
          };
        }
        return null;
      }).filter(q => q !== null);
    }
    return [];
  };
  
  const prescreening = extractPrescreening();
  const outreachMessage = person.outreach?.message || "";
  const scoringDetails = person.scoring?.WhySuits || "";
  const backgroundCheck = person.backgroundChecks?.summary || 
                        (person.backgroundChecks?.flagged?.length > 0 ? "Issues found" : "No issues found");
  const backgroundFlags = person.backgroundChecks?.flagged || [];

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

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8 text-white">
            <div className="flex items-start gap-6">
              <img
                src={avatar}
                alt={name}
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
              />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{name}</h1>
                    {title && <p className="text-xl opacity-90 mb-2">{title}</p>}
                    
                    {(locationStr || experience) && (
                      <p className="opacity-75 mb-2">
                        {locationStr}{locationStr && experience && " • "}{experience}
                      </p>
                    )}
                    
                    {(connections > 0 || followers > 0) && (
                      <p className="text-sm opacity-75">
                        {connections > 0 && `${connections} connections`}
                        {connections > 0 && followers > 0 && ' • '}
                        {followers > 0 && `${followers} followers`}
                      </p>
                    )}
                  </div>
                  
                  {languages.length > 0 && (
                    <div className="text-right">
                      <p className="text-sm font-medium mb-1">Languages</p>
                      <div className="flex gap-1">
                        {languages.map((lang, i) => (
                          <span key={i} className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-xs">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {matchScore > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                      {matchScore}% Match
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={handleContactClick}
                className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Contact
              </button>
            </div>
          </div>

          {/* Key Insights Section */}
          {(scoringDetails || backgroundCheck !== "No issues found") && (
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold mb-3 text-gray-900">
                Key Insights
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {scoringDetails && (
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                    <h3 className="font-medium text-green-800 mb-1 flex gap-2 items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Match Analysis
                    </h3>
                    <p className="text-sm text-gray-700">{scoringDetails}</p>
                  </div>
                )}
                {backgroundCheck && backgroundCheck !== "No issues found" && (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                    <h3 className="font-medium text-red-800 mb-1 flex gap-2 items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Background Check
                    </h3>
                    <p className="text-sm text-gray-700">{backgroundCheck}</p>
                    {backgroundFlags.length > 0 && (
                      <ul className="mt-1 text-xs text-red-700 list-disc pl-4">
                        {backgroundFlags.map((flag, i) => <li key={i}>{flag}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Content Section */}
          <div className="p-6">
            {/* Summary */}
            {summary && (
              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3 text-gray-900">
                  About
                </h2>
                <div className="text-gray-700 leading-relaxed whitespace-pre-line">{summary}</div>
              </section>
            )}

            {/* Prescreening Questions */}
            {prescreening.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3 text-gray-900">
                  Prescreening Questions
                </h2>
                <div className="space-y-3 ">
                  {prescreening.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <h3 className="font-normal text-gray-800 mb-1">{item.question}</h3>
                      
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Skills */}
            {skills.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3 text-gray-900">
                  Skills
                </h2>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, index) => (
                    <span
                      key={index}
                      className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-200 flex items-center gap-2"
                    >
                      {skill.name}
                      {skill.endorsementCount > 0 && (
                        <span className="bg-blue-100 px-1.5 rounded-full text-xs">
                          {skill.endorsementCount}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Experience */}
            {experienceDetails.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">
                  Experience
                </h2>
                <div className="space-y-4">
                  {experienceDetails.map((exp, index) => (
                    <div
                      key={index}
                      className="border-l-2 border-blue-200 pl-4 pb-4"
                    >
                      <h3 className="font-semibold text-gray-900">
                        {exp.position}
                      </h3>
                      <p className="text-blue-600 font-medium">{exp.company}</p>
                      <p className="text-sm text-gray-500 mb-2">{exp.duration}</p>
                      {exp.description && <p className="text-gray-700">{exp.description}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Education */}
            {educationDetails.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3 text-gray-900">
                  Education
                </h2>
                {educationDetails.map((edu, index) => (
                  <div key={index} className="border-l-2 border-green-200 pl-4 mb-4">
                    <h3 className="font-semibold text-gray-900">{edu.degree}</h3>
                    <p className="text-green-600 font-medium">
                      {edu.institution}
                    </p>
                    {edu.year && <p className="text-sm text-gray-500">{edu.year}</p>}
                  </div>
                ))}
              </section>
            )}

            {/* Certifications */}
            {certifications.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3 text-gray-900">
                  Certifications
                </h2>
                {certifications.map((cert, index) => (
                  <div key={index} className="border-l-2 border-yellow-200 pl-4 mb-4">
                    <h3 className="font-semibold text-gray-900">{cert.name}</h3>
                    {cert.authority && (
                      <p className="text-yellow-600 font-medium">{cert.authority}</p>
                    )}
                    {cert.date && <p className="text-sm text-gray-500">{cert.date}</p>}
                  </div>
                ))}
              </section>
            )}

            {/* Links */}
            {(linkedin || github || website) && (
              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3 text-gray-900">
                  Links
                </h2>
                <div className="flex flex-wrap gap-4">
                  {linkedin && (
                    <a
                      href={linkedin.startsWith("http") ? linkedin : `https://${linkedin}`}
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
                  )}
                  {github && (
                    <a
                      href={github.startsWith("http") ? github : `https://${github}`}
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
                  )}
                  {website && (
                    <a
                      href={website.startsWith("http") ? website : `https://${website}`}
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
                      Website
                    </a>
                  )}
                </div>
              </section>
            )}
            
            {/* Outreach Message (if available) */}
            {outreachMessage && (
              <section className="mt-8 border-t pt-6">
                <h2 className="text-xl font-semibold mb-3 text-gray-900 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Suggested Outreach Message
                </h2>
                <div className="bg-gray-50 p-5 rounded-lg text-gray-700 whitespace-pre-line border border-gray-200 shadow-sm">
                  {outreachMessage}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(outreachMessage);
                    alert('Outreach message copied to clipboard!');
                  }}
                  className="mt-3 flex items-center gap-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-1.5 px-3 rounded"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy Message
                </button>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonProfile;
