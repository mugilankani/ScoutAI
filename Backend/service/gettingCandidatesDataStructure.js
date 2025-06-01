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
    console.log("Starting candidate data structure generation with candidates:");
    
    const system = `
You are an expert data processor. Your job is to extract, clean, and organize all available details from multiple LinkedIn-scraped candidate profiles.
You must convert the raw, possibly messy input into a well-structured JSON object for each candidate, following the provided ProfileSchema.
`;

    const prompt = `
Given the following array of raw LinkedIn candidate data, transform each candidate's information into a clean, structured JSON object that matches the ProfileSchema.

<Candidates>
${JSON.stringify(candidates, null, 2)}
</Candidates>

Instructions:
- For each candidate, extract all available and useful information.
- Organize the data according to the ProfileSchema fields (personalInfo, contactInfo, socialInfo, location, socialUpdates, currentRole, experiences, education, skills, languages, certifications, honorsAndAwards, projects, volunteerExperience, interests, recommendations).
- Do not omit any valid or useful information present in the input.
- If a field is missing in the input, leave it undefined or empty as per the schema.
- Ensure all URLs are valid and all arrays/objects follow the schema structure.
- Output only valid JSON, using double quotes for all keys and string values, and no trailing commas.
- Return the result as a single JSON object or array of objects, matching the ProfileSchema.
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
