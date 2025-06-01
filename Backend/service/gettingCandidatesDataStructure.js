import { genkit, z } from "genkit";
import { gemini25FlashPreview0417, googleAI } from "@genkit-ai/googleai";
import dotenv from "dotenv";
dotenv.config();

const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  model: gemini25FlashPreview0417,
});

const ProfilePictureSchema = z.object({
  small: z.string().optional(),
  medium: z.string().optional(),
  large: z.string().optional(),
});

const PersonalInfoSchema = z.object({
  publicIdentifier: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string().optional(),
  headline: z.string().optional(),
  about: z.string().optional(),
});

const ContactInfoSchema = z.object({
  // Remove .email() from z.string() for Gemini compatibility
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
});

const SocialInfoSchema = z.object({
  linkedinUrl: z.string().optional(),
  profilePicture: ProfilePictureSchema.optional(),
  connectionsCount: z.number().int().optional(),
  followersCount: z.number().int().optional(),
});

const LocationSchema = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

const ReactionsSchema = z
  .object({
    LIKE: z.number().int().optional(),
    PRAISE: z.number().int().optional(),
    EMPATHY: z.number().int().optional(),
  })
  .optional();

const MetricsSchema = z
  .object({
    likes: z.number().int().optional(),
    comments: z.number().int().optional(),
    reactions: ReactionsSchema,
  })
  .optional();

const SocialUpdateSchema = z.object({
  postText: z.string(),
  postLink: z.string().optional(),
  image: z.string().optional(),
  metrics: MetricsSchema,
});

const CompanySchema = z.object({
  name: z.string(),
  companyId: z.string().optional(),
  linkedinUrl: z.string().optional(),
});

const CurrentRoleSchema = z.object({
  title: z.string(),
  company: CompanySchema,
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(), // e.g., "Present" or "2025-04"
  durationInMonths: z.number().int().optional(),
  description: z.string().optional(),
});

const ExperienceSchema = z.object({
  title: z.string(),
  company: CompanySchema,
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  durationInMonths: z.number().int().optional(),
  description: z.string().optional(),
});

const EducationInstitutionSchema = z.object({
  name: z.string(),
  companyId: z.string().optional(),
  linkedinUrl: z.string().optional(),
});

const EducationSchema = z.object({
  institution: EducationInstitutionSchema,
  degree: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  activitiesAndSocieties: z.array(z.string()).optional(),
});

const SkillSchema = z.object({
  name: z.string(),
  endorsementCount: z.number().int().optional(),
  endorsedBy: z.array(z.string()).optional(),
});

const LanguageSchema = z.object({
  name: z.string(),
  proficiency: z.string().optional(),
});

const CertificationSchema = z.object({
  name: z.string(),
  issuer: z.string().optional(),
  issueDate: z.string().optional(),
  credentialId: z.string().optional(),
});

const HonorAwardSchema = z.object({
  title: z.string(),
  issuer: z.string().optional(),
  date: z.string().optional(),
});

const ProjectSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  projectLink: z.string().optional(),
});

const VolunteerExperienceSchema = z.object({
  role: z.string(),
  organization: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
});

const TopVoiceSchema = z.object({
  name: z.string(),
  followers: z.string().optional(),
  profileUrl: z.string().optional(),
});

const CompanyInterestSchema = z.object({
  name: z.string(),
  followers: z.string().optional(),
  companyUrl: z.string().optional(),
});

const GroupInterestSchema = z.object({
  name: z.string(),
  members: z.string().optional(),
  groupUrl: z.string().optional(),
});

const NewsletterPublisherSchema = z.object({
  name: z.string(),
  profileUrl: z.string().optional(),
});

const NewsletterInterestSchema = z.object({
  name: z.string(),
  frequency: z.string().optional(),
  description: z.string().optional(),
  publisher: NewsletterPublisherSchema.optional(),
  newsletterUrl: z.string().optional(),
});

const SchoolInterestSchema = z.object({
  name: z.string(),
  followers: z.string().optional(),
  schoolUrl: z.string().optional(),
});

const InterestsSchema = z.object({
  topVoices: z.array(TopVoiceSchema).optional(),
  companies: z.array(CompanyInterestSchema).optional(),
  groups: z.array(GroupInterestSchema).optional(),
  newsletters: z.array(NewsletterInterestSchema).optional(),
  schools: z.array(SchoolInterestSchema).optional(),
});

const RecommendationSchema = z.object({
  givenBy: z.string().optional(),
  relationship: z.string().optional(),
  text: z.string().optional(),
  date: z.string().optional(),
});

export const ProfileSchema = z.object({
  personalInfo: PersonalInfoSchema,
  contactInfo: ContactInfoSchema.optional(),
  socialInfo: SocialInfoSchema.optional(),
  location: LocationSchema.optional(),
  socialUpdates: z.array(SocialUpdateSchema).optional(),
  currentRole: CurrentRoleSchema.optional(),
  experiences: z.array(ExperienceSchema).optional(),
  education: z.array(EducationSchema).optional(),
  skills: z.array(SkillSchema).optional(),
  languages: z.array(LanguageSchema).optional(),
  certifications: z.array(CertificationSchema).optional(),
  honorsAndAwards: z.array(HonorAwardSchema).optional(),
  projects: z.array(ProjectSchema).optional(),
  volunteerExperience: z.array(VolunteerExperienceSchema).optional(),
  interests: InterestsSchema.optional(),
  recommendations: z.array(RecommendationSchema).optional(),
});

// Outreach message flow
export const gettingCandidatesDataStructure = ai.defineFlow(
  {
    name: "outReachMessage",
    description: `Takes multiple LinkedIn scraping results and processes them into a structured format for storage in the database.`,
    InputSchema: z.object({
      candidates: z.array(z.object()),
    }),
    OutputSchema: z.object({}),
  },
  async ({ candidates }) => {
    console.log(
      "Starting candidate data structure generation with candidates:",
      candidates
    );

    const system = `
You are an expert data processor specializing in candidate profile standardization. Your critical task is to extract, clean, and organize ALL available details from EVERY LinkedIn profile in the input array. 

CRITICAL REQUIREMENTS:
1. Process ALL candidates in the input array - do not skip any candidates for any reason
2. Extract and preserve ALL information available for each candidate - nothing should be omitted
3. Structure each profile according to the ProfileSchema without exception
4. If information exists in the input but doesn't match a schema field exactly, find the most appropriate field

Your goal is 100% data preservation while ensuring each profile conforms exactly to the required schema and every candidate is in the same consistent format.
`;

    const prompt = `
Transform the following array of ${
      candidates.length
    } raw LinkedIn candidate profiles into a clean, standardized array of objects that precisely match the ProfileSchema. You MUST process ALL ${
      candidates.length
    } candidates.

<Candidates>
${JSON.stringify(candidates, null, 2)}
</Candidates>

STRICT PROCESSING REQUIREMENTS:
1. Return EXACTLY ${
      candidates.length
    } structured profiles - one for each input candidate
2. Preserve all unique identifiers including: fingerPrint, fingerprint, id, publicIdentifier, or any other field that could serve as a unique identifier
3. For every profile, populate ALL of these mandatory sections (even if with minimal data):
   - personalInfo (with at minimum firstName, lastName, and publicIdentifier)
   - contactInfo (if available)
   - socialInfo (especially linkedinUrl)
   - location
   - currentRole (if available)
   - experiences
   - education
   - skills

4. Do not omit ANY valid information from these optional sections if present:
   - languages
   - certifications
   - honorsAndAwards
   - projects
   - volunteerExperience
   - interests
   - recommendations
   - socialUpdates

5. For each array field (experiences, education, skills, etc.) include ALL items from the source data

6. If the input contains fields not explicitly defined in the schema but containing useful information, map them to the closest appropriate schema field

7. Ensure all output is valid JSON with:
   - Double quotes for all keys and string values
   - No trailing commas
   - No undefined values (use null or empty arrays/objects instead)
   - Proper nesting according to the schema

OUTPUT FORMAT:
Return an array containing EXACTLY ${
      candidates.length
    } profile objects structured according to the schema. Each profile must have at least the mandatory fields populated.

This data will be used directly by multiple tools that require ALL candidate information - incomplete processing will cause downstream failures.
`;

    const { output } = await ai.generate({
      system,
      prompt,
      output: {
        schema: z.array(ProfileSchema),
      },
    });

    console.log("Generated profile output:");

    return output;
  }
);
