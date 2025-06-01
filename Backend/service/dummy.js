import { genkit } from "genkit";
import { z } from "zod";
import {
  googleAI,
  gemini25FlashPreview0417,
  gemini25ProPreview0325,
  textEmbedding004,
} from "@genkit-ai/googleai";
import dotenv from "dotenv";
dotenv.config();
import { defineFirestoreRetriever } from "@genkit-ai/firebase";
import { firestore } from "../config/firebaseAdmin.js";
import JSON5 from "json5";
import { gettingCandidatesDataStructure } from "./gettingCandidatesDataStructure.js";
import { promisify } from "util";
import { exec } from "child_process";
import { FieldValue } from "firebase-admin/firestore";
const execAsync = promisify(exec);
import crypto from "crypto";
// GENKIT SETUP

// Retry utility for Genkit/Google AI API calls
async function withRetry(
  fn,
  maxRetries = 2,
  delayMs = 1000,
  fallbackRetries = 2,
  fallbackDelayMs = 5000
) {
  let attempt = 0;
  let lastError;
  const start = Date.now();
  // First round of retries (short delay)
  for (; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      const elapsed = Date.now() - start;
      console.log(
        `withRetry: Success after ${
          attempt + 1
        } attempt(s), elapsed ${elapsed}ms`
      );
      return result;
    } catch (err) {
      lastError = err;
      if (
        err?.status === 500 ||
        (err?.message && err.message.includes("Internal Server Error"))
      ) {
        if (attempt < maxRetries) {
          await new Promise((res) => setTimeout(res, delayMs));
        }
      } else {
        throw err;
      }
    }
  }
  // Second round of retries (longer delay)
  for (
    let fallbackAttempt = 0;
    fallbackAttempt < fallbackRetries;
    fallbackAttempt++
  ) {
    try {
      const result = await fn();
      const elapsed = Date.now() - start;
      console.log(
        `withRetry: Success after fallback attempt ${
          fallbackAttempt + 1
        }, elapsed ${elapsed}ms`
      );
      return result;
    } catch (err) {
      lastError = err;
      if (
        err?.status === 500 ||
        (err?.message && err.message.includes("Internal Server Error"))
      ) {
        if (fallbackAttempt < fallbackRetries - 1) {
          await new Promise((res) => setTimeout(res, fallbackDelayMs));
        }
      } else {
        throw err;
      }
    }
  }
  const elapsed = Date.now() - start;
  console.error(`withRetry: All retries failed after ${elapsed}ms`);
  throw lastError;
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  model: gemini25FlashPreview0417,
});

export const indexJsonFlow = ai.defineTool(
  {
    name: "indexJsonFlow",
    description: "Processes JSON data, embeds, and stores it in Firestore",
    InputSchema: z.object({
      jsonData: z.any().describe("JSON data to be indexed"),
      documentName: z
        .string()
        .optional()
        .describe("Optional document name for metadata"),
    }),
    OutputSchema: z.object({
      success: z.boolean().describe("Whether the indexing was successful"),
      message: z.string().describe("Status message"),
      docId: z.string().optional().describe("ID of the created document"),
      error: z.string().optional().describe("Error message if any"),
    }),
  },
  async (input) => {
    try {
      // Convert JSON to string for embedding
      const jsonString = JSON.stringify(input.jsonData, null, 2);

      console.log(`Processing JSON data with ${jsonString.length} characters`);

      const docId = await embedAndStoreJson(
        jsonString,
        input.jsonData,
        input.documentName || `json_doc_${Date.now()}`
      );

      return {
        success: true,
        message: `Successfully indexed JSON data`,
        docId,
      };
    } catch (error) {
      console.error("JSON Flow error:", error);
      return {
        success: false,
        message: "Failed to process JSON data",
        error: error.message,
      };
    }
  }
);

// Fingerprint generation logic (same as in candidateUtils.js)
function generateFingerprint(candidate) {
  // Priority: email > linkedin > github
  const email = candidate?.contactInfo?.email || candidate?.email || "";
  const linkedin =
    candidate?.socialInfo?.linkedinUrl || candidate?.profiles?.linkedin || "";
  const github = candidate?.profiles?.github || "";

  let base = "";
  if (linkedin) {
    base = linkedin;
  } else if (github) {
    base = github;
  } else if (email) {
    base = email;
  } else {
    // fallback: hash the JSON string itself
    base = JSON.stringify(candidate);
  }

  return crypto.createHash("sha256").update(base).digest("hex");
}

// Helper function to clean undefined values from object
function cleanUndefinedValues(obj) {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefinedValues).filter((item) => item !== undefined);
  }
  if (typeof obj === "object") {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        const cleanedValue = cleanUndefinedValues(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
    }
    return cleaned;
  }
  return obj;
}

// JSON embedding and storing function
async function embedAndStoreJson(jsonString, originalJson, documentName) {
  try {
    console.log("Generating embedding for JSON data...");

    // Generate fingerprint if not present
    let fingerprint = originalJson.fingerprint;
    if (!fingerprint) {
      fingerprint = generateFingerprint(originalJson);
    }

    // Clean the original JSON to remove undefined values
    const cleanedJson = cleanUndefinedValues(originalJson);
    cleanedJson.fingerprint = fingerprint;

    // Generate embedding for the JSON string
    const embeddingResult = await ai.embed({
      embedder: textEmbedding004,
      content: jsonString,
    });

    const embedding = embeddingResult[0].embedding;

    const docRef = firestore.collection("json_documents").doc(documentName);

    // Fetch existing doc to preserve createdAt if present
    let createdAt = FieldValue.serverTimestamp();
    const existingDoc = await docRef.get();
    if (existingDoc.exists && existingDoc.data()?.metadata?.createdAt) {
      createdAt = existingDoc.data().metadata.createdAt;
    }

    await docRef.set(
      {
        embedding: FieldValue.vector(embedding),
        content: jsonString,
        originalData: cleanedJson,
        fingerprint: fingerprint,
        metadata: {
          documentName,
          timestamp: FieldValue.serverTimestamp(),
          charCount: jsonString.length,
          source: "json",
          type: "json_document",
          createdAt: createdAt,
          updatedAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );

    console.log(
      `✅ JSON document stored/updated in Firestore with ID: ${docRef.id}`
    );
    return docRef.id;
  } catch (error) {
    console.error("Failed to embed or store JSON:", error);
    throw error;
  }
}

// JSON Retriever
const jsonRetriever = defineFirestoreRetriever(ai, {
  name: "jsonRetriever",
  firestore,
  collection: "json_documents",
  contentField: "content",
  vectorField: "embedding",
  embedder: textEmbedding004,
  distanceMeasure: "COSINE",
});

// JSON Retrieve and Generate Flow
export const retrieveAndGenerateJsonAnswer = ai.defineTool(
  {
    name: "retrieveAndGenerateJsonAnswer",
    description:
      "Retrieve all the candidate details for the Manager Query. This tool searches through candidate profiles stored in Firestore and returns relevant matches based on the input query.",
    inputSchema: z.object({
      query: z.string().describe("User question or hiring requirements"),
    }),
    outputSchema: z.object({
      status: z.string().describe("Processing status"),
      error: z.string().optional().describe("Error message if any"),
      retrievedDocs: z
        .array(z.any())
        .optional()
        .describe("Retrieved documents for reference"),
    }),
  },
  async ({ query }) => {
    try {
      console.log("entering into the Retriever tool");
      console.log("Query received:", query);

      if (!query || typeof query !== "string") {
        console.error("Invalid query parameter:", query);
        return {
          input: query || "undefined",
          output: "Invalid query parameter provided",
          status: "error",
          error: "Query parameter is required and must be a string",
        };
      }

      const userQuestion = query;

      // Format the query properly for the retriever
      const retrievalQuery = {
        content: [{ text: userQuestion }],
      };

      console.log(
        "Formatted retrieval query:",
        JSON.stringify(retrievalQuery, null, 2)
      );

      // Retrieve top 10 similar documents
      const docs = await ai.retrieve({
        retriever: jsonRetriever,
        query: retrievalQuery,
        options: { limit: 10 },
      });

      console.log("Retrieved docs count:", docs?.length || 0);

      if (!docs || docs.length === 0) {
        return {
          input: userQuestion,
          output: "No relevant JSON documents found for your query.",
          status: "success",
          retrievedDocs: [],
        };
      }

      // Process retrieved documents
      const processedDocs = docs
        .map((doc, index) => {
          let content = "";
          if (
            doc.content &&
            Array.isArray(doc.content) &&
            doc.content.length > 0
          ) {
            content = doc.content[0].text || "";
          }
          // Try to parse content as JSON5, fallback to raw string if parsing fails
          let parsedContent = content;
          try {
            if (typeof content === "string") {
              parsedContent = JSON5.parse(content);
            }
          } catch (err) {
            console.error(
              "Failed to parse doc content as JSON5:",
              content,
              err
            );
            // fallback: keep as string
          }
          return {
            index: index + 1,
            content: parsedContent,
            metadata: doc.metadata || {},
          };
        })
        .filter((doc) =>
          typeof doc.content === "string"
            ? doc.content.trim() !== ""
            : !!doc.content
        );

      console.log("Processed docs:", processedDocs.length);
      console.log(processedDocs);

      if (processedDocs.length === 0) {
        return {
          input: userQuestion,
          output: "Found documents but could not extract meaningful content.",
          status: "error",
          error: "No valid content found in retrieved documents",
        };
      }

      const result = {
        status: "success",
        retrievedDocs: processedDocs.map((doc) => ({
          content: doc.content,
        })),
      };
      return result;
    } catch (error) {
      console.error("Error in retrieveAndGenerateJsonAnswer:", error);
      return {
        input: query || "undefined",
        output: "",
        status: "error",
        error: `An error occurred while processing your request: ${error.message}`,
      };
    }
  }
);

export const backgroundChecks = ai.defineTool(
  {
    name: "backgroundChecks",
    description: `Performs automated background checks on an array of candidates by validating their claimed skills, experience, and projects against public GitHub data.
For each candidate, this tool scrapes their GitHub profile (if available), compares it to their resume, and flags any discrepancies or suspicious claims.
It returns a JSON array with each candidate's fingerprint, a match status, a list of flagged issues, and a summary of the background check.
Use this tool to verify the authenticity of candidates' technical backgrounds and identify potential resume exaggerations.`,
    InputSchema: z.array(
      z.object({
        dataOfpeople: z.array(z.string()).describe("candidates data"),
        userQuery: z.string().describe("User query for scoring criteria"),
      })
    ),
    OutputSchema: z.array(
      z.object({
        fingerPrint: z.string().describe("Unique identifier for the candidate"),
        backgroundChecks: z.object({
          isMatch: z.boolean(),
          flagged: z.array(z.string()),
          summary: z.string(),
        }),
      })
    ),
  },
  async ({ dataOfpeople, userQuery }) => {
    console.log("scoringCriteria input:", { dataOfpeople, userQuery });
    const prompt = `
You are an expert technical recruiter. For each candidate in the provided array, perform a background check as follows:

- Use the candidate's GitHub profile URL (if available) to scrape public information about their repositories, contributions, and skills.
- Compare the candidate's claimed skills, experience, and projects with the data found on GitHub.
- Identify and flag any discrepancies or suspicious claims (e.g., skills listed on the resume but not evidenced in public repos).
- If you cannot verify a particular claim (e.g., no public repos available), note that in "flagged" and set isMatch=false.
- For each candidate, return a JSON object with:
  - fingerPrint (string): the candidate’s unique identifier
  - backgroundChecks:
    - isMatch (boolean): true if public data generally corroborates the resume, false if there are discrepancies
    - flagged (array of strings): detailed notes on every issue or mismatch found
    - summary (string): a brief explanation of the overall background-check result

Input: Array of candidate objects.
Output: Array of background check results as described above.

<Candidates data>
${JSON.stringify(dataOfpeople, null, 2)}
</Candidates data>
Instructions:
- Return only valid JSON.
- Use double quotes for all keys and string values.
- Do not use single quotes.
- Do not include trailing commas.
`;

    const { output } = await withRetry(() =>
      ai.generate({
        system: `You are an expert technical recruiter. When called, you will receive an array of candidates. For each candidate:
• Fetch their GitHub profile using the provided GitHub URL (via a GitHub scraper).
• Compare the candidate’s claimed skills, experience, and projects against what you find on GitHub.
• Identify any inconsistencies (for example, a skill listed on the resume but not evidenced in public repos).
• Produce a JSON array where each element contains:
– fingerPrint (string): the candidate’s unique identifier
– backgroundChecks:
• isMatch (boolean): true if public data generally corroborates the resume, false if there are discrepancies
• flagged (array of strings): detailed notes on every issue or mismatch found
• summary (string): a brief explanation of the overall background-check result

If you cannot verify a particular claim (e.g., no public repos available), note that in “flagged” and set isMatch=false.

`,
        prompt,
        output: {
          schema: z.array(
            z.object({
              backgroundChecks: z.object({
                isMatch: z.boolean(),
                flagged: z.array(z.string()),
                summary: z.string(),
              }),
            })
          ),
        },
      })
    );
    // Ensure output is a non-empty array with required fields
    if (!Array.isArray(output) || output.length === 0) {
      // Return a default/fallback object or throw a controlled error
      return [
        {
          fingerPrint: "no_candidate",
          backgroundChecks: {
            isMatch: false,
            flagged: ["No valid candidates found for background check."],
            summary: "No candidates were available for background check.",
          },
        },
      ];
    }
    // Optionally, filter out invalid objects and ensure all required fields exist
    const validOutput = output.filter(
      (c) =>
        c.fingerPrint &&
        c.backgroundChecks &&
        typeof c.backgroundChecks.isMatch === "boolean" &&
        Array.isArray(c.backgroundChecks.flagged) &&
        typeof c.backgroundChecks.summary === "string"
    );
    if (validOutput.length === 0) {
      return [
        {
          fingerPrint: "no_candidate",
          backgroundChecks: {
            isMatch: false,
            flagged: ["No valid candidates found for background check."],
            summary: "No candidates were available for background check.",
          },
        },
      ];
    }
    return validOutput;
  }
);

export const generatePrescreenQuestions = ai.defineTool(
  {
    name: "generatePrescreenQuestions",
    description: `Creates 5 tailored prescreening interview questions for a candidate and a specific job role.
Given candidate details and a user query (such as a job description), this tool generates insightful, role-specific questions to assess the candidate's fit.
The questions are customized to the candidate's background and the requirements of the role, and returned as an array with the candidate's name and fingerprint.
Use this tool to prepare effective prescreening interviews for any candidate-role combination.`,
    InputSchema: z.object({
      candidate: z.array(z.string()).describe("candidates data"),
      userQuery: z.string(),
    }),
    OutputSchema: z.array(
      z.object({
        name: z.string(),
        fingerprint: z.string(),
        questions: z.array(z.string()).length(5),
      })
    ),
  },
  async ({ candidate, userQuery }) => {
    console.log("generatePrescreenQuestions input:", {
      candidate: candidate.length,
      userQuery,
    });
    const system = `
You are an expert technical recruiter. Your task is to create high-quality, role-specific prescreening questions for candidates.
You will receive candidate details and a job description. Use both to generate questions that assess the candidate's fit for the role.
Always tailor the questions to the candidate's background and the requirements of the job.
Return the result as an array of objects, each containing:
- name: candidate's name
- fingerprint: candidate's unique identifier
- questions: an array of 5 prescreening questions (strings)
`;

    const prompt = `
Generate 5 high-quality prescreening questions for each candidate below, based on their details and the provided job description.

Candidate:
${JSON.stringify(candidate, null, 2)}

Job Description:
${userQuery}

Instructions:
- Tailor each question to the candidate's experience, skills, and the job requirements.
- Make questions specific, relevant, and suitable for a prescreening interview.
- Return only the questions as a JSON array of 5 strings for each candidate, including their name and fingerprint.
Instructions:
- Return only valid JSON.
- Use double quotes for all keys and string values.
- Do not use single quotes.
- Do not include trailing commas.
`;

    const { output } = await withRetry(() =>
      ai.generate({
        system,
        prompt,
        output: {
          schema: z.array(
            z.object({
              name: z.string(),
              fingerprint: z.string(),
              questions: z.array(z.string()).length(5),
            })
          ),
        },
      })
    );
    console.log("generatePrescreenQuestions output:", output);
    return output;
  }
);

// Outreach message flow
export const outReachMessage = ai.defineTool(
  {
    name: "outReachMessage",
    description: `Generates a highly personalized outreach message for a candidate, inviting them to interview for a specific role at a company.
Given the candidate's profile and company details, this tool crafts a professional, engaging message that references the candidate's unique skills and experiences, explains why the company is interested, and provides clear next steps.
Use this tool to automate and personalize candidate engagement for recruiting and talent acquisition.`,
    InputSchema: z.object({
      candidate: z.array(z.string()).describe("candidates data"),
      companyDetails: z.string(),
    }),
    OutputSchema: z.array(
      z.object({
        fingerPrint: z.string().describe("Unique identifier for the candidate"),
        message: z.string(),
      })
    ),
  },
  async ({ candidate, companyDetails }) => {
    console.log("outReachMessage input:", {
      candidate: candidate.length,
      companyDetails,
    });
    const system = `
You are an expert technical recruiter and outreach specialist. Your job is to craft highly personalized, professional, and engaging outreach messages to candidates on behalf of a hiring company.
Use the candidate's profile and the company's details to make the message relevant, inviting, and clear about the opportunity.
Always address the candidate by name, mention specific skills or experiences from their profile, and clearly state the role and next steps.
`;

    const prompt = `
Generate a personalized outreach message for the following candidate, inviting them to interview for a specific role at the company.
Highlight why they are a good fit based on their background, and make the invitation warm and professional.

<Candidate>
${JSON.stringify(candidate, null, 2)}
</Candidate>

<Company Details>
${JSON.stringify(companyDetails, null, 2)}
</Company Details>

Instructions:
- Address the candidate by name.
- Reference specific skills, projects, or experiences from their profile.
- Clearly state the role and why the company is interested in them.
- Invite them to interview and explain how to respond.
- Keep the tone friendly, professional, and concise.
- Return only the outreach message as a string.
Instructions:
- Return only valid JSON.
- Use double quotes for all keys and string values.
- Do not use single quotes.
- Do not include trailing commas.
`;

    const { output } = await withRetry(() =>
      ai.generate({
        system,
        prompt,
        output: {
          schema: z.array(
            z.object({
              fingerPrint: z
                .string()
                .describe("Unique identifier for the candidate"),
              message: z.string(),
            })
          ),
        },
      })
    );
    console.log("outReachMessage output:", output);
    return output;
  }
);

const aiOutputSchema = z.array(
  z.object({
    scoring: z.array(
      z.object({
        name: z.string(),
        fingerPrint: z.string().describe("Unique identifier for the candidate"),
        score: z.number().min(0).max(10).describe("Score out of 10 in float"),
        WhyHeSuits: z.string().describe("Why the candidate suits the job"),
      })
    ),
  })
);

export const scoringCriteria = ai.defineTool(
  {
    name: "scoringCriteria",
    description: `Evaluates and ranks a list of candidate profiles for a specific job or user query.
Given an array of candidate data and a user query (such as a job description or requirements), this tool analyzes each candidate's experience, skills, and background.
It assigns a score (0-10) to each candidate, explains why they are (or are not) a good fit, and returns a structured JSON array with detailed reasoning for each candidate.
Use this tool to objectively compare and prioritize candidates for a particular role or requirement.`,
    InputSchema: z.array(
      z.object({
        dataOfpeople: z.array(z.string()).describe("candidates data"),
        userQury: z.string().describe("User query for scoring criteria"),
      })
    ),
    OutputSchema: z.array(
      z.object({
        jsonOutput: z
          .array()
          .describe(
            "Scoring criteria output in JSON format for all the candidates"
          ),
      })
    ),
  },
  async ({ dataOfpeople, userQuery }) => {
    console.log("scoringCriteria input:", { dataOfpeople, userQuery });
    const system = `
You are an expert technical recruiter and candidate evaluator. Your job is to objectively score and explain the suitability of each candidate for a given role, based strictly on their provided data and the user's query.
For each candidate, provide:
- name
- fingerPrint (unique identifier)
- score (float, 0-10)
- WhyHeSuits: a concise, evidence-based explanation of their fit or lack thereof.
Be fair, detailed, and reference specific skills or experience. Do not speculate beyond the provided data.
Return the result as a JSON array, one object per candidate.
`;

    const prompt = `
Score each candidate below for the following user query and role requirements.

Candidates:
${JSON.stringify(dataOfpeople, null, 2)}

User Query:
${userQuery}

Instructions:
- Carefully review each candidate's experience, skills, and background.
- Score each candidate out of 10.0 (float) for how well they fit the user query and role requirements.
- For each candidate, provide:
  - name
  - fingerPrint
  - score (float, 0-10)
  - WhyHeSuits: a concise explanation referencing specific skills or experience.
- Be objective, fair, and detailed in your reasoning.
- Return only a JSON array, one object per candidate, as described above.
Instructions:
- Return only valid JSON.
- Use double quotes for all keys and string values.
- Do not use single quotes.
- Do not include trailing commas.
`;

    const { output } = await withRetry(() =>
      ai.generate({
        system,
        prompt,
        model: gemini25FlashPreview0417,
        output: { schema: aiOutputSchema },
      })
    );
    console.log("scoringCriteria output:", output);
    return {
      jsonOutput: output,
    };
  }
);

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

const ReactionsSchema = z.object({
  LIKE: z.number().int().optional(),
  PRAISE: z.number().int().optional(),
  EMPATHY: z.number().int().optional(),
});

const MetricsSchema = z.object({
  likes: z.number().int().optional(),
  comments: z.number().int().optional(),
  reactions: ReactionsSchema,
});

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

export const CandidateSchema = z.array(
  z.object({
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

    fingerPrint: z.string(),

    scoring: z.object({
      score: z.number().min(0).max(10),
      WhyHeSuits: z.string(),
    }),

    prescreening: z.object({
      questions: z.array(z.string()).length(5),
    }),

    outreach: z.object({
      message: z.string(),
    }),

    backgroundChecks: z.object({
      isMatch: z.boolean(),
      flagged: z.array(z.string()),
      summary: z.string(),
    }),
  })
);

export const agentParentFlow = ai.defineFlow(
  {
    name: "agentParentFlow",
    description:
      "Parent agent that processes hiring requirements and returns candidate profiles with comprehensive analysis.",
    inputSchema: z.object({
      input: z
        .string()
        .describe("Manager's hiring requirement or job description"),
      candidates: z.array(z.object()),
    }),
    outputSchema: CandidateSchema,
  },
  async ({ input, candidates }) => {
    try {
      const structuredCandidates = await gettingCandidatesDataStructure({
        candidates,
      });
      console.log("Structured candidates generated:", structuredCandidates);
      if (!Array.isArray(structuredCandidates)) {
        console.error(
          "Input 'structuredCandidates' is not an array:",
          structuredCandidates
        );
        return [];
      }
      console.log("Starting main workflow with candidates:", candidates.length);

      // Index each structured candidate in Firestore using indexJsonFlow
      if (Array.isArray(structuredCandidates)) {
        for (const candidate of structuredCandidates) {
          try {
            // Generate a document name based on candidate info or fallback to timestamp
            const documentName = `Candidate_doc_${Date.now()}`;
            const result = await indexJsonFlow({
              jsonData: candidate,
              documentName,
            });
            console.log("Indexed candidate:", result);
          } catch (err) {
            console.error("Failed to index candidate:", candidate, err);
          }
        }
      }

      console.log("Starting agentParentFlow with input:", input);

      const system = `
You are a Hiring Manager Agent that follows the ReAct (Reasoning + Acting) style. Your task is to process a manager's hiring requirement, break it down into a sequence of steps, use the provided tools to gather and analyze candidate information, and assemble a final JSON array of candidate profiles with all required fields filled.
`;

      const prompt = `


Here is the manager's hiring requirement:
<Manager Requirement>
${input}
</Manager Requirement>

Follow the ReAct step-by-step pattern, which consists of:
Thought N: <brief reasoning>
Action N: <tool name + input>
Observation N: <tool output or "(mocked output)">

You have access to the following tools:

1. retrieveAndGenerateJsonAnswer
   Input: { query: "<manager requirement or search string>" }
   Output: Returns an object with input, output, status, and retrievedDocs (array of candidate objects).

2. scoringCriteria
   Input: { dataOfpeople: [<array of candidate JSON strings>], userQuery: "<job description or requirement>" }
   Output: Returns an array of objects with scoring details for each candidate.

3. backgroundChecks
   Input: { dataOfpeople: [<array of candidate JSON strings>], userQuery: "<job description or requirement>" }
   Output: Returns an array of objects with background check results for each candidate.

4. generatePrescreenQuestions
   Input: { candidate: [<array of candidate JSON strings>], userQuery: "<job description>" }
   Output: Returns an array of objects with 5 tailored questions for each candidate.

5. outReachMessage
   Input: { candidate: [<array of candidate JSON strings>], companyDetails: "<company details string>" }
   Output: Returns an object with a personalized outreach message for each candidate.

Follow these steps to complete the hiring process:

1. Use retrieveAndGenerateJsonAnswer to get initial candidate data based on the manager's requirement.
2. Apply scoringCriteria to evaluate the candidates' fit for the position.
3. Conduct backgroundChecks on the candidates.
4. Generate prescreening questions using generatePrescreenQuestions.
5. Create personalized outreach messages with outReachMessage.

After each step, take time to properly organize and collect all the data before passing it to the next tool. Don't rush; ensure all information is accurately gathered and processed.

If at any point you discover missing information needed to proceed (for example, no candidates returned by retrieve), revise your query or call retrieveAndGenerateJsonAnswer again until you have valid data to continue.

When you have completed all required steps, output a single JSON array that lists each candidate object, conforming to the CandidateSchema. Each candidate object should include:

• full_name, email, phone, location, summary, skills, experience_level, projects, certifications, achievements, education, profiles, source
• fingerPrint (unique ID string)
• scoring: { score (0–10), WhyHeSuits (short justification) }
• backgroundChecks: { isMatch (boolean), flagged (string[]), summary (string) }
• prescreening: { questions (string[5]) }
• outreach: { message (string) }

Here's an example of the ReAct steps you should follow:

Thought 1: I need to retrieve all potential candidate data matching the manager's requirement.
Action 1: retrieveAndGenerateJsonAnswer({ query: "<manager requirement>" })
Observation 1: [Array of candidate objects]

Thought 2: Score the candidates for fit.
Action 2: scoringCriteria({ dataOfpeople: [<candidate JSON strings>], userQuery: "<job description>" })
Observation 2: [Array of scoring results]

Thought 3: Perform background checks.
Action 3: backgroundChecks({ dataOfpeople: [<candidate JSON strings>], userQuery: "<job description>" })
Observation 3: [Array of background check results]

Thought 4: Generate prescreen questions.
Action 4: generatePrescreenQuestions({ candidate: "[<candidate JSON strings>]", userQuery: "<job description>" })
Observation 4: [Array of prescreen questions]

Thought 5: Generate outreach messages.
Action 5: outReachMessage({ candidate: "[<candidate JSON strings>]", companyDetails: "<company details string>" })
Observation 5: [Array of outreach messages]

Thought 6: Combine all the results with the exact match candidate and give the output.

Remember to always start by retrieving candidates with retrieveAndGenerateJsonAnswer, then enrich with scoringCriteria, backgroundChecks, generatePrescreenQuestions, and outReachMessage, merging results by fingerPrint at each step. Return only the final JSON array of candidates as your output.
`;

      const { output } = await withRetry(() =>
        ai.generate({
          system,
          prompt,
          model: gemini25ProPreview0325,
          tools: [
            retrieveAndGenerateJsonAnswer,
            scoringCriteria,
            backgroundChecks,
            generatePrescreenQuestions,
            outReachMessage,
          ],
          output: {
            schema: CandidateSchema,
          },
        })
      );

      console.log("Agent flow completed successfully");
      return output;
    } catch (error) {
      console.error("Error in agentParentFlow:", error);

      // Return empty array with proper schema structure as fallback
      return [];
    }
  }
);

/*
// JSON Retrieve and Generate Flow
export const retrieveAndGenerateJsonAnswer = ai.defineTool(
  {
    name: "retrieveAndGenerateJsonAnswer",
    description:
      "Retrieve all the candidate details for the Manager Query. This tool searches through candidate profiles stored in Firestore and returns relevant matches based on the input query.",
    inputSchema: z.object({
      query: z.string().describe("User question or hiring requirements"),
    }),
    outputSchema: z.object({
      status: z.string().describe("Processing status"),
      error: z.string().optional().describe("Error message if any"),
      retrievedDocs: z
        .array(z.any())
        .optional()
        .describe("Retrieved documents for reference"),
    }),
  },
  async ({ query }) => {
    try {
      console.log("entering into the Retriever tool");
      console.log("Query received:", query);

      if (!query || typeof query !== "string") {
        console.error("Invalid query parameter:", query);
        return {
          input: query || "undefined",
          output: "Invalid query parameter provided",
          status: "error",
          error: "Query parameter is required and must be a string",
        };
      }

      const userQuestion = query;

      // Format the query properly for the retriever
      const retrievalQuery = {
        content: [{ text: userQuestion }],
      };

      console.log(
        "Formatted retrieval query:",
        JSON.stringify(retrievalQuery, null, 2)
      );

      // Retrieve top 10 similar documents
      const docs = await ai.retrieve({
        retriever: jsonRetriever,
        query: retrievalQuery,
        options: { limit: 10 },
      });

      console.log("Retrieved docs count:", docs?.length || 0);

      if (!docs || docs.length === 0) {
        return {
          input: userQuestion,
          output: "No relevant JSON documents found for your query.",
          status: "success",
          retrievedDocs: [],
        };
      }

      // Process retrieved documents
      const processedDocs = docs
        .map((doc, index) => {
          let content = "";
          if (
            doc.content &&
            Array.isArray(doc.content) &&
            doc.content.length > 0
          ) {
            content = doc.content[0].text || "";
          }
          // Try to parse content as JSON5, fallback to raw string if parsing fails
          let parsedContent = content;
          try {
            if (typeof content === "string") {
              parsedContent = JSON5.parse(content);
            }
          } catch (err) {
            console.error(
              "Failed to parse doc content as JSON5:",
              content,
              err
            );
            // fallback: keep as string
          }
          return {
            index: index + 1,
            content: parsedContent,
            metadata: doc.metadata || {},
          };
        })
        .filter((doc) =>
          typeof doc.content === "string"
            ? doc.content.trim() !== ""
            : !!doc.content
        );

      console.log("Processed docs:", processedDocs.length);
      console.log(processedDocs);

      if (processedDocs.length === 0) {
        return {
          input: userQuestion,
          output: "Found documents but could not extract meaningful content.",
          status: "error",
          error: "No valid content found in retrieved documents",
        };
      }

      const result = {
        status: "success",
        retrievedDocs: processedDocs.map((doc) => ({
          content: doc.content,
        })),
      };
      return result;
    } catch (error) {
      console.error("Error in retrieveAndGenerateJsonAnswer:", error);
      return {
        input: query || "undefined",
        output: "",
        status: "error",
        error: `An error occurred while processing your request: ${error.message}`,
      };
    }
  }
);

export const backgroundChecks = ai.defineTool(
  {
    name: "backgroundChecks",
    description: `Performs automated background checks on an array of candidates by validating their claimed skills, experience, and projects against public GitHub data.
For each candidate, this tool scrapes their GitHub profile (if available), compares it to their resume, and flags any discrepancies or suspicious claims.
It returns a JSON array with each candidate's fingerprint, a match status, a list of flagged issues, and a summary of the background check.
Use this tool to verify the authenticity of candidates' technical backgrounds and identify potential resume exaggerations.`,
    InputSchema: z.array(
      z.object({
        candidates: z.array(z.string()).describe("candidates data"),
        input: z.string().describe("User query for scoring criteria"),
      })
    ),
    OutputSchema: z.array(
      z.object({
        fingerPrint: z.string().describe("Unique identifier for the candidate"),
        backgroundChecks: z.object({
          isMatch: z.boolean(),
          flagged: z.array(z.string()),
          summary: z.string(),
        }),
      })
    ),
  },
  async ({ candidates, input }) => {
    console.log("scoringCriteria input:", {
      candidates: candidates,
      input,
    });
    const prompt = `
You are an expert technical recruiter. For each candidate in the provided array, perform a background check as follows:

- Use the candidate's GitHub profile URL (if available) to scrape public information about their repositories, contributions, and skills.
- Compare the candidate's claimed skills, experience, and projects with the data found on GitHub.
- Identify and flag any discrepancies or suspicious claims (e.g., skills listed on the resume but not evidenced in public repos).
- If you cannot verify a particular claim (e.g., no public repos available), note that in "flagged" and set isMatch=false.
- For each candidate, return a JSON object with:
  - fingerPrint (string): the candidate’s unique identifier
  - backgroundChecks:
    - isMatch (boolean): true if public data generally corroborates the resume, false if there are discrepancies
    - flagged (array of strings): detailed notes on every issue or mismatch found
    - summary (string): a brief explanation of the overall background-check result

Input: Array of candidate objects.
Output: Array of background check results as described above.


<Manager Requirements>
${input}
</Manager Requirements>

<Candidates data>
${JSON.stringify(candidates, null, 2)}
</Candidates data>
Instructions:
- Return only valid JSON.
- Use double quotes for all keys and string values.
- Do not use single quotes.
- Do not include trailing commas.
`;

    const { output } = await withRetry(() =>
      ai.generate({
        system: `You are an expert technical recruiter. When called, you will receive an array of candidates. For each candidate:
• Fetch their GitHub profile using the provided GitHub URL (via a GitHub scraper).
• Compare the candidate’s claimed skills, experience, and projects against what you find on GitHub.
• Identify any inconsistencies (for example, a skill listed on the resume but not evidenced in public repos).
• Produce a JSON array where each element contains:
– fingerPrint (string): the candidate’s unique identifier
– backgroundChecks:
• isMatch (boolean): true if public data generally corroborates the resume, false if there are discrepancies
• flagged (array of strings): detailed notes on every issue or mismatch found
• summary (string): a brief explanation of the overall background-check result

If you cannot verify a particular claim (e.g., no public repos available), note that in “flagged” and set isMatch=false.

`,
        prompt,
        output: {
          schema: z.array(
            z.object({
              backgroundChecks: z.object({
                isMatch: z.boolean(),
                flagged: z.array(z.string()),
                summary: z.string(),
              }),
            })
          ),
        },
      })
    );
    // Ensure output is a non-empty array with required fields
    if (!Array.isArray(output) || output.length === 0) {
      // Return a default/fallback object or throw a controlled error
      return [
        {
          fingerPrint: "no_candidate",
          backgroundChecks: {
            isMatch: false,
            flagged: ["No valid candidates found for background check."],
            summary: "No candidates were available for background check.",
          },
        },
      ];
    }
    // Optionally, filter out invalid objects and ensure all required fields exist
    const validOutput = output.filter(
      (c) =>
        c.fingerPrint &&
        c.backgroundChecks &&
        typeof c.backgroundChecks.isMatch === "boolean" &&
        Array.isArray(c.backgroundChecks.flagged) &&
        typeof c.backgroundChecks.summary === "string"
    );
    if (validOutput.length === 0) {
      return [
        {
          fingerPrint: "no_candidate",
          backgroundChecks: {
            isMatch: false,
            flagged: ["No valid candidates found for background check."],
            summary: "No candidates were available for background check.",
          },
        },
      ];
    }
    return validOutput;
  }
);

export const generatePrescreenQuestions = ai.defineTool(
  {
    name: "generatePrescreenQuestions",
    description: `Creates 5 tailored prescreening interview questions for a candidate and a specific job role.
Given candidate details and a user query (such as a job description), this tool generates insightful, role-specific questions to assess the candidate's fit.
The questions are customized to the candidate's background and the requirements of the role, and returned as an array with the candidate's name and fingerprint.
Use this tool to prepare effective prescreening interviews for any candidate-role combination.`,
    InputSchema: z.object({
      candidates: z.array(z.string()).describe("candidates data"),
      input: z.string(),
    }),
    OutputSchema: z.array(
      z.object({
        name: z.string(),
        fingerprint: z.string(),
        questions: z.array(z.string()).length(5),
      })
    ),
  },
  async ({ candidates, input }) => {
    console.log("generatePrescreenQuestions input:", {
      candidate: candidates.length,
      input,
    });
    const system = `
You are an expert technical recruiter. Your task is to create high-quality, role-specific prescreening questions for candidates.
You will receive candidate details and a job description. Use both to generate questions that assess the candidate's fit for the role.
Always tailor the questions to the candidate's background and the requirements of the job.
Return the result as an array of objects, each containing:
- name: candidate's name
- fingerprint: candidate's unique identifier
- questions: an array of 5 prescreening questions (strings)
`;

    const prompt = `
Generate 5 high-quality prescreening questions for each candidate below, based on their details and the provided job description.

Candidate:
${JSON.stringify(candidates, null, 2)}

Job Description:
${input}

Instructions:
- Tailor each question to the candidate's experience, skills, and the job requirements.
- Make questions specific, relevant, and suitable for a prescreening interview.
- Return only the questions as a JSON array of 5 strings for each candidate, including their name and fingerprint.
Instructions:
- Return only valid JSON.
- Use double quotes for all keys and string values.
- Do not use single quotes.
- Do not include trailing commas.
`;

    const { output } = await withRetry(() =>
      ai.generate({
        system,
        prompt,
        output: {
          schema: z.array(
            z.object({
              name: z.string(),
              fingerprint: z.string(),
              questions: z.array(z.string()).length(5),
            })
          ),
        },
      })
    );
    console.log("generatePrescreenQuestions output:", output);
    return output;
  }
);

// Outreach message flow
export const outReachMessage = ai.defineTool(
  {
    name: "outReachMessage",
    description: `Generates a highly personalized outreach message for a candidate, inviting them to interview for a specific role at a company.
Given the candidate's profile and company details, this tool crafts a professional, engaging message that references the candidate's unique skills and experiences, explains why the company is interested, and provides clear next steps.
Use this tool to automate and personalize candidate engagement for recruiting and talent acquisition.`,
    InputSchema: z.object({
      candidates: z.array(z.string()).describe("candidates data"),
      companyDetails: z.string(),
    }),
    OutputSchema: z.array(
      z.object({
        fingerPrint: z.string().describe("Unique identifier for the candidate"),
        message: z.string(),
      })
    ),
  },
  async ({ candidates, companyDetails }) => {
    console.log("outReachMessage input:", {
      candidate: candidates.length,
      companyDetails,
    });
    const system = `
You are an expert technical recruiter and outreach specialist. Your job is to craft highly personalized, professional, and engaging outreach messages to candidates on behalf of a hiring company.
Use the candidate's profile and the company's details to make the message relevant, inviting, and clear about the opportunity.
Always address the candidate by name, mention specific skills or experiences from their profile, and clearly state the role and next steps.
`;

    const prompt = `
Generate a personalized outreach message for the following candidate, inviting them to interview for a specific role at the company.
Highlight why they are a good fit based on their background, and make the invitation warm and professional.

<Candidate>
${JSON.stringify(candidates, null, 2)}
</Candidate>

<Company Details>
${JSON.stringify(companyDetails, null, 2)}
</Company Details>

Instructions:
- Address the candidates by name.
- Reference specific skills, projects, or experiences from their profile.
- Clearly state the role and why the company is interested in them.
- Invite them to interview and explain how to respond.
- Keep the tone friendly, professional, and concise.
- Return only the outreach message as a string.
Instructions:
- Return only valid JSON.
- Use double quotes for all keys and string values.
- Do not use single quotes.
- Do not include trailing commas.
`;

    const { output } = await withRetry(() =>
      ai.generate({
        system,
        prompt,
        output: {
          schema: z.array(
            z.object({
              fingerPrint: z
                .string()
                .describe("Unique identifier for the candidate"),
              message: z.string(),
            })
          ),
        },
      })
    );
    console.log("outReachMessage output:", output);
    return output;
  }
);

const aiOutputSchema = z.array(
  z.object({
    scoring: z.array(
      z.object({
        name: z.string(),
        fingerPrint: z.string().describe("Unique identifier for the candidate"),
        score: z.number().min(0).max(10).describe("Score out of 10 in float"),
        WhyHeSuits: z.string().describe("Why the candidate suits the job"),
      })
    ),
  })
);

export const scoringCriteria = ai.defineTool(
  {
    name: "scoringCriteria",
    description: `Evaluates and ranks a list of candidate profiles for a specific job or user query.
Given an array of candidate data and a user query (such as a job description or requirements), this tool analyzes each candidate's experience, skills, and background.
It assigns a score (0-10) to each candidate, explains why they are (or are not) a good fit, and returns a structured JSON array with detailed reasoning for each candidate.
Use this tool to objectively compare and prioritize candidates for a particular role or requirement.`,
    InputSchema: z.array(
      z.object({
        candidates: z.array(z.string()).describe("candidates data"),
        input: z.string().describe("User query for scoring criteria"),
      })
    ),
    OutputSchema: z.array(
      z.object({
        jsonOutput: z
          .array()
          .describe(
            "Scoring criteria output in JSON format for all the candidates"
          ),
      })
    ),
  },
  async ({ candidates, input }) => {
    console.log("scoringCriteria input:", { candidates, input });
    const system = `
You are an expert technical recruiter and candidate evaluator. Your job is to objectively score and explain the suitability of each candidate for a given role, based strictly on their provided data and the user's query.
For each candidate, provide:
- name
- fingerPrint (unique identifier)
- score (float, 0-10)
- WhyHeSuits: a concise, evidence-based explanation of their fit or lack thereof.
Be fair, detailed, and reference specific skills or experience. Do not speculate beyond the provided data.
Return the result as a JSON array, one object per candidate.
`;

    const prompt = `
Score each candidate below for the following user query and role requirements.

Candidates:
${JSON.stringify(candidates, null, 2)}

User Query:
${input}

Instructions:
- Carefully review each candidate's experience, skills, and background.
- Score each candidate out of 10.0 (float) for how well they fit the user query and role requirements.
- For each candidate, provide:
  - name
  - fingerPrint
  - score (float, 0-10)
  - WhyHeSuits: a concise explanation referencing specific skills or experience.
- Be objective, fair, and detailed in your reasoning.
- Return only a JSON array, one object per candidate, as described above.
Instructions:
- Return only valid JSON.
- Use double quotes for all keys and string values.
- Do not use single quotes.
- Do not include trailing commas.
`;

    const { output } = await withRetry(() =>
      ai.generate({
        system,
        prompt,
        model: gemini25FlashPreview0417,
        output: { schema: aiOutputSchema },
      })
    );
    console.log("scoringCriteria output:", output);
    return {
      jsonOutput: output,
    };
  }
);
export const childrentAgentScoringAndBackground = ai.defineTool(
  {
    name: "AgentWorkOnScoringAndBackground",
    description:
      "Children agent that works on scoring the candidates and performing background checks.",
    inputSchema: z.object({
      input: z
        .string()
        .describe("Manager's hiring requirement or job description"),
      candidates: z.array(z.object()),
    }),
    outputSchema: z.array(
      z.object({
        fingerPrint: z.string().describe("Unique identifier for the candidate"),
        backgroundChecks: z.object({
          isMatch: z.boolean(),
          flagged: z.array(z.string()),
          summary: z.string(),
        }),
        scoring: z.array(
          z.object({
            name: z.string(),
            fingerPrint: z
              .string()
              .describe("Unique identifier for the candidate"),
            score: z
              .number()
              .min(0)
              .max(10)
              .describe("Score out of 10 in float"),
            WhyHeSuits: z.string().describe("Why the candidate suits the job"),
          })
        ),
      })
    ),
  },
  async ({ input, candidates }) => {
    console.log("childrentAgentForPrescreenMsgAndOutReachMail input:", {
      input,
      candidates: candidates,
    });
    try {
      const system = `
You are a specialized hiring agent responsible for evaluating candidates for a specific job requirement. Your task is to score each candidate for fit and perform background checks using the provided tools. You will only return scoring and background check results for each candidate.
`;
      const prompt = `
Here is the manager's hiring requirement:
<manager_requirement>
${input}

</manager_requirement>

Here are the full details of the candidates:
<candidates>
${candidates}
</candidates>

You have access to the following tools:

1. scoringCriteria
   Input: { candidates: [<array of candidate JSON strings>], input: "<job description or requirement>" }
   Output: Returns an array of objects with scoring details for each candidate.

2. backgroundChecks
   Input: { candidates: [<array of candidate JSON strings>], input: "<job description or requirement>" }
   Output: Returns an array of objects with background check results for each candidate.

Follow the ReAct step-by-step pattern, which consists of:
Thought N: <brief reasoning>
Action N: <tool name + input>
Observation N: <tool output or "(mocked output)">

Follow these steps to complete the hiring process:

1. Apply scoringCriteria to evaluate the candidates' fit for the position.
2. Conduct backgroundChecks on the candidates.

After each step, take time to properly organize and collect all the data before passing it to the next tool. Don't rush; ensure all information is accurately gathered and processed.

If at any point you discover missing information needed to proceed (for example, no candidates returned by scoringCriteria), revise your query or call "scoringCriteria" again until you have valid data to continue.

When you have completed all required steps, output a single JSON array that lists each candidate object. Each candidate object should include:

• scoring: { score (0–10), WhyHeSuits (short justification) }
• backgroundChecks: { isMatch (boolean), flagged (string[]), summary (string) }

Here's an example of the ReAct steps you should follow:

Thought 1: Score the candidates for fit.
Action 1: scoringCriteria({ candidates: [<candidate JSON strings>], input: "<job description>" })
Observation 1: [Array of scoring results]

Thought 2: Perform background checks.
Action 2: backgroundChecks({ candidates: [<candidate JSON strings>], input: "<job description>" })
Observation 2: [Array of background check results]

Thought 3: Combine all the results and prepare the final output.

Remember to always start by scoring candidates with scoringCriteria, then enrich with backgroundChecks. Return only the final JSON array of candidates as your output.
`;
      const { output } = await withRetry(() =>
        ai.generate({
          system,
          prompt,
          model: gemini25ProPreview0325,
          tools: [scoringCriteria, backgroundChecks],
          output: {
            schema: z.array(
              z.object({
                fingerPrint: z
                  .string()
                  .describe("Unique identifier for the candidate"),
                backgroundChecks: z.object({
                  isMatch: z.boolean(),
                  flagged: z.array(z.string()),
                  summary: z.string(),
                }),
                scoring: z.array(
                  z.object({
                    name: z.string(),
                    score: z
                      .number()
                      .min(0)
                      .max(10)
                      .describe("Score out of 10 in float"),
                    WhyHeSuits: z
                      .string()
                      .describe("Why the candidate suits the job"),
                  })
                ),
              })
            ),
          },
        })
      );

      console.log("Agent flow completed successfully");
      return output;
    } catch (error) {
      console.error("Error in agentParentFlow:", error);

      // Return empty array with proper schema structure as fallback
      return [];
    }
  }
);

export const childrentAgentForPrescreenMsgAndOutReachMail = ai.defineTool(
  {
    name: "childrentAgentForPrescreenMsgAndOutReachMail",
    description:
      "Children agent that works on creating prescreening questions and outreach messages for the candidates.",
    inputSchema: z.object({
      input: z
        .string()
        .describe("Manager's hiring requirement or job description"),
      candidates: z.array(z.object()),
    }),
    outputSchema: z.array(
      z.object({
        name: z.string(),
        fingerprint: z.string(),
        questions: z
          .array(z.string())
          .length(5)
          .describe("Prescreening questions for the candidate"),
        OutReachmessage: z
          .string()
          .describe("Outreach message for the candidate"),
      })
    ),
  },
  async ({ input, candidates }) => {
    try {
      const system = `
You are a specialized hiring assistant AI. Your task is to generate prescreening questions and personalized outreach messages for job candidates based on the manager's hiring requirement and candidate details.
`;
      const prompt = `
You will be provided with two inputs:

<manager_requirement>
${input}
</manager_requirement>

<candidates_details>
${candidates}
</candidates_details>

You have access to two tools to help you complete this task:

1. generatePrescreenQuestions
   Input: { candidate: [<array of candidate JSON strings>], input: "<job description>" }
   Output: Returns an array of objects with 5 tailored questions for each candidate.

2. outReachMessage
   Input: { candidate: [<array of candidate JSON strings>], companyDetails: "<company details string>" }
   Output: Returns an object with a personalized outreach message for each candidate.

Follow these steps to complete the hiring process:

1. Generate prescreening questions using generatePrescreenQuestions.
2. Create personalized outreach messages with outReachMessage.

For each step, use the ReAct (Reasoning and Acting) format:

Thought N: <brief reasoning>
Action N: <tool name + input>
Observation N: <tool output>

After completing all steps, output a single JSON array that lists each candidate object. Each candidate object should include:

• prescreening: { questions (string[5]) }
• outreach: { message (string) }

Here's an example of the ReAct steps you should follow:

Thought 1: Generate prescreen questions.
Action 1: generatePrescreenQuestions({ candidate: "[<candidate JSON strings>]", input: "<job description>" })
Observation 1: [Array of prescreen questions]

Thought 2: Generate outreach messages.
Action 2: outReachMessage({ candidate: "[<candidate JSON strings>]", companyDetails: "<company details string>" })
Observation 2: [Array of outreach messages]

Thought 3: Combine all the results and prepare the final output.

Remember:
- Always start by prescreening candidates with generatePrescreenQuestions, then enrich with outReachMessage.
- Merge results for each candidate at each step.
- Return only the final JSON array of candidates as your output.
- If you encounter any issues or missing information, revise your query or call the appropriate tool again until you have valid data to continue.

Begin your process now, starting with Thought 1.

`;
      const { output } = await withRetry(() =>
        ai.generate({
          system,
          prompt,
          model: gemini25ProPreview0325,
          tools: [generatePrescreenQuestions, outReachMessage],
          output: {
            schema: z.array(
              z.object({
                name: z.string(),
                fingerprint: z.string(),
                questions: z
                  .array(z.string())
                  .length(5)
                  .describe("Prescreening questions for the candidate"),
                OutReachmessage: z
                  .string()
                  .describe("Outreach message for the candidate"),
              })
            ),
          },
        })
      );

      console.log("Agent flow completed successfully");
      return output;
    } catch (error) {
      console.error("Error in agentParentFlow:", error);

      // Return empty array with proper schema structure as fallback
      return [];
    }
  }
);

export const agentParentFlow = ai.defineFlow(
  {
    name: "agentParentFlow",
    description:
      "Parent agent that processes hiring requirements and returns candidate profiles with comprehensive analysis.",
    inputSchema: z.object({
      input: z
        .string()
        .describe("Manager's hiring requirement or job description"),
      candidates: z.array(z.object()),
    }),
    outputSchema: CandidateSchema,
  },
  async ({ input, candidates }) => {
    try {
      // const structuredCandidates = await gettingCandidatesDataStructure({
      //   candidates,
      // });
      // console.log("Structured candidates generated:", structuredCandidates);
      // if (!Array.isArray(structuredCandidates)) {
      //   console.error(
      //     "Input 'structuredCandidates' is not an array:",
      //     structuredCandidates
      //   );
      //   return [];
      // }
      // console.log("Starting main workflow with candidates:", candidates.length);

      // // Index each structured candidate in Firestore using indexJsonFlow
      // if (Array.isArray(structuredCandidates)) {
      //   for (const candidate of structuredCandidates) {
      //     try {
      //       // Generate a document name based on candidate info or fallback to timestamp
      //       const documentName = `Candidate_doc_${Date.now()}`;
      //       const result = await indexJsonFlow({
      //         jsonData: candidate,
      //         documentName,
      //       });
      //       console.log("Indexed candidate:", result);
      //     } catch (err) {
      //       console.error("Failed to index candidate:", candidate, err);
      //     }
      //   }
      // }

      console.log("Starting agentParentFlow with input:", input);

      const system = `
You are a Hiring Manager Agent that follows the ReAct (Reasoning + Acting) style. Your task is to process a manager's hiring requirement, break it down into a sequence of steps, use the provided tools to gather and analyze candidate information, and assemble a final JSON array of candidate profiles with all required fields filled.
`;

      const prompt = `
Here is the manager's hiring requirement:
<manager_requirement>
${input}
</manager_requirement>

Follow the ReAct step-by-step pattern, which consists of:
Thought N: <brief reasoning>
Action N: <tool name + input>
Observation N: <tool output or "(mocked output)">

You have access to the following tools:

1. retrieveAndGenerateJsonAnswer
   Input: { query: "<manager requirement or search string>" }
   Output: Returns an object with input, output, status, and retrievedDocs (array of candidate objects).

2. childrentAgentScoringAndBackground
   Input: { input: "<job description or requirement>", candidates: [<array of candidate JSON strings>] }
   Output: Returns an array of objects with scoring details and background check results for each candidate.

3. childrentAgentForPrescreenMsgAndOutReachMail
   Input: { input: "<job description or requirement>", candidates: [<array of candidate JSON strings>] }
   Output: Returns an array of objects with 5 tailored questions and a personalized outreach message for each candidate.

Follow these steps to complete the hiring process:

1. Use retrieveAndGenerateJsonAnswer to get initial candidate data based on the manager's requirement.
2. Apply childrentAgentScoringAndBackground to evaluate and perform background checks on the candidates' fit for the position.
3. Generate prescreening questions and personalized outreach messages with childrentAgentForPrescreenMsgAndOutReachMail.

After each step, take time to properly organize and collect all the data before passing it to the next tool. Ensure all information is accurately gathered and processed.

If at any point you discover missing information needed to proceed (for example, no candidates returned by retrieve), revise your query or call retrieveAndGenerateJsonAnswer again until you have valid data to continue.

When you have completed all required steps, output a single JSON array that lists each candidate object, conforming to the CandidateSchema. Each candidate object should include:

• full_name, email, phone, location, summary, skills, experience_level, projects, certifications, achievements, education, profiles, source
• fingerPrint (unique ID string)
• scoring and backgroundChecks: { score (0–10), WhyHeSuits (short justification), isMatch (boolean), flagged (string[]), summary (string) }
• prescreening and outreach: { questions (string[5]), message (string) }

Here's an example of the ReAct steps you should follow:

Thought 1: I need to retrieve all potential candidate data matching the manager's requirement.
Action 1: retrieveAndGenerateJsonAnswer({ query: "<manager requirement>" })
Observation 1: [Array of candidate objects]

Thought 2: Score the candidates for fit and perform background checks.
Action 2: childrentAgentScoringAndBackground({ input: "<job description or requirement>", candidates: [<array of candidate JSON strings>] })
Observation 2: [Array of scoring and background check results]

Thought 3: Generate prescreen questions and outreach messages.
Action 3: childrentAgentForPrescreenMsgAndOutReachMail({ input: "<job description or requirement>", candidates: [<array of candidate JSON strings>] })
Observation 3: [Array of prescreen questions and outreach messages]

Thought 4: Combine all the results with the exact matching candidate and give the output.

Remember to always start by retrieving candidates with retrieveAndGenerateJsonAnswer, then enrich with childrentAgentScoringAndBackground and childrentAgentForPrescreenMsgAndOutReachMail, merging results by fingerPrint at each step. Return only the final JSON array of candidates as your output.

Begin your process now, starting with Thought 1 and following the ReAct pattern throughout. Ensure you complete all necessary steps before providing the final JSON array output.
`;

      const { output } = await withRetry(() =>
        ai.generate({
          system,
          prompt,
          model: gemini25ProPreview0325,
          tools: [
            retrieveAndGenerateJsonAnswer,
            childrentAgentScoringAndBackground,
            childrentAgentForPrescreenMsgAndOutReachMail,
          ],
          output: {
            schema: CandidateSchema,
          },
        })
      );

      console.log("Agent flow completed successfully");
      return output;
    } catch (error) {
      console.error("Error in agentParentFlow:", error);

      // Return empty array with proper schema structure as fallback
      return [];
    }
  }
);
 */
