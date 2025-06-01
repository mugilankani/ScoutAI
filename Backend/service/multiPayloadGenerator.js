// genkit-multi-payload-generator.ts
import { genkit } from "genkit";
import { z } from 'zod';
import dotenv from 'dotenv';
import { googleAI, gemini25FlashPreview0417 } from "@genkit-ai/googleai";

dotenv.config();

const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  model: gemini25FlashPreview0417,
});

// Define the schema for the input and output
const SerpApiLocationPayloadSchema = z.object({
  q: z.string().describe('Query string for the SerpApi Locations API.'),
});

const SerpApiSearchPayloadSchema = z.object({
  engine: z.union([z.literal('google_light'), z.literal('google')]).describe('Search engine to use (e.g., "google_light").'),
  q: z.string().describe('The clean search query string, with no quotes around keywords.'),
  location: z.string().optional().describe('Specific location for the search, optional. Used for precise city/state/region targeting.'),
  google_domain: z.string().optional().describe('Google domain to use (e.g., "google.com", "google.co.in").'),
  hl: z.string().optional().describe('Language code (e.g., "en", "fr").'),
  gl: z.string().optional().describe('Country code (e.g., "us", "in", "de").'),
  api_key: z.string().optional().describe('API key for SerpApi, passed externally.'),
});

const MultiPayloadInputSchema = z.object({
  recruiterQuery: z.string().describe('The recruiter’s natural language query (e.g., "Find senior Gen-AI engineers with LangChain + RAG experience in Europe, open to contract work").'),
});

const MultiPayloadOutputSchema = z.object({
  location: z.array(SerpApiLocationPayloadSchema).describe('Array of SerpApi Locations API payloads, or an empty array if not applicable.'),
  serp: z.array(SerpApiSearchPayloadSchema).describe('Array of SerpApi search payloads.'),
});

// Define the Genkit Flow
export const generateMultiPayloadsFlow = ai.defineFlow(
  {
    name: 'generateMultiPayloads',
    description: 'Generates SerpApi search and location payloads from a recruiter query.',
    inputSchema: MultiPayloadInputSchema,
    outputSchema: MultiPayloadOutputSchema,
  },
  async ({ recruiterQuery }) => {
    // The comprehensive prompt for the LLM
    const prompt = `
      You are an expert search query generator for a talent acquisition platform, specifically designed to create JSON payloads for the SerpApi Google search engine. Your task is to transform a recruiter's natural language request into a structured JSON response that includes:

      1.  A SerpApi Locations API payload (when a specific city/state/region is provided) LIMIT TO 3 LOCATIONS, and
      2.  A list of SerpApi search payloads targeting LinkedIn, GitHub, or Stack Overflow profiles.

      **Instructions:**
      1.  **Identify Key Elements:** Extract:
          * Job role(s) (e.g., "HR Business Partner", "Senior GenAI Engineer")
          * Specific skills or technologies (e.g., "LangChain", "RAG", "change management")
          * Experience level (e.g., "junior", "senior", "experienced", "PhD")
          * Location(s) (e.g., "Europe", "Kerala, India", "Berlin") - *Crucial for conditional logic*
          * Work criteria (e.g., "contract", "remote", "open to work", "full-time")

      2.  **Location Payload Logic:**
          * **If the location is specific (e.g., "Kochi, Kerala, India", "Paris, France", "Austin, Texas", "Berlin"):**
              * Generate a **single** Locations API payload in the 'location' array.
              * Example: \`{"q": "Kochi, Kerala, India"}\`
          * **If the location is broad (e.g., "India", "Europe", "US", "UK"):**
              * The 'location' array should be **empty**.
              * Use the country directly in the 'gl' (geographical location) field of the SerpApi search payloads where appropriate. For "Europe," generate payloads for key countries like Germany, France, UK, Netherlands, etc., setting their respective 'gl' and 'google_domain'.

      CHECK FOR ONLY ONE LOCATION AND GET THE ONE LOCATION AND GIVE THAT ONLY, GIVE ONE LOCATION. 
      MAX THREE LOCATIONS, IF THERE ARE MORE THAN THREE LOCATIONS, THEN GIVE AND LIMIT ONLY THREE LOCATIONS.
      3.  **Generate 5–10 Distinct SerpApi Search Payloads (for the 'serp' array):**
          * Each payload MUST be a JSON object with this structure:
              \`\`\`json
              {
                "engine": "google_light",
                "q": "Google search query here",
                "google_domain": "google.com",
                "hl": "en",
                "gl": "us" // Adjust for country based on location or query
              }
              \`\`\`
          * **'q' field formatting:** The search query string for 'q' must be **clean** and contain **NO quotes around any multi-word phrases** (e.g., write "HR Business Partner" as 'HR Business Partner').
          * **Site Targeting:** Use 'site:linkedin.com/in', 'site:github.com', or 'site:stackoverflow.com/users' to focus searches on professional profiles.
          * **Defaults:** Default 'google_domain' to "google.com", 'hl' to "en", and 'gl' to "us" unless the country or language in the recruiter query explicitly implies otherwise (e.g., "French speakers in France" should imply hl: "fr", gl: "fr", google_domain: "google.fr").

      4.  **Output Format:**
          * Return ONLY a single JSON object with two keys:
              * "location": An array containing the location payload(s) if applicable, otherwise an empty array '[]'.
              * "serp": An array containing the list of SerpApi search payloads.
          * Do not include any other text, explanations, or formatting outside this exact JSON object.

      **Recruiter Request:** "${recruiterQuery}"

      **Expected JSON Output Example 1 (Specific Location: "Kerala, India"):**
      \`\`\`json
      {
        "location": [{"q": "Kochi, Kerala, India"}],
        "serp": [
          {
            "engine": "google_light",
            "q": "site:linkedin.com/in Senior GenAI Engineer LangChain RAG Kochi",
            "location": "Kochi, Kerala, India",
            "google_domain": "google.co.in",
            "hl": "en",
            "gl": "in"
          },
          {
            "engine": "google_light",
            "q": "site:github.com GenAI LangChain RAG India",
            "google_domain": "google.co.in",
            "hl": "en",
            "gl": "in"
          },
          {
            "engine": "google_light",
            "q": "site:stackoverflow.com/users GenAI LangChain RAG Kerala",
            "google_domain": "google.co.in",
            "hl": "en",
            "gl": "in"
          }
        ]
      }
      \`\`\`

      **Expected JSON Output Example 2 (Broad Location: "Europe"):**
      \`\`\`json
      {
        "location": [],
        "serp": [
          {
            "engine": "google_light",
            "q": "site:linkedin.com/in Senior GenAI Engineer LangChain RAG Europe contract",
            "google_domain": "google.com",
            "hl": "en"
          },
          {
            "engine": "google_light",
            "q": "site:linkedin.com/in Generative AI LangChain RAG Germany open to work",
            "google_domain": "google.de",
            "hl": "en",
            "gl": "de"
          },
          {
            "engine": "google_light",
            "q": "site:linkedin.com/in AI Engineer LangChain RAG France (python OR tensorflow)",
            "google_domain": "google.fr",
            "hl": "en",
            "gl": "fr"
          },
          {
            "engine": "google_light",
            "q": "site:github.com GenAI LangChain RAG resume Europe",
            "google_domain": "google.com",
            "hl": "en"
          },
          {
            "engine": "google_light",
            "q": "site:stackoverflow.com/users GenAI LangChain RAG profile UK",
            "google_domain": "google.co.uk",
            "hl": "en",
            "gl": "uk"
          }
        ]
      }
      \`\`\`

      **Expected JSON Output Example 3 (No Explicit Location):**
      \`\`\`json
      {
        "location": [],
        "serp": [
          {
            "engine": "google_light",
            "q": "site:linkedin.com/in Data Scientist Machine Learning Remote",
            "google_domain": "google.com",
            "hl": "en",
            "gl": "us"
          },
          {
            "engine": "google_light",
            "q": "site:github.com Data Science Python TensorFlow",
            "google_domain": "google.com",
            "hl": "en",
            "gl": "us"
          }
        ]
      }
      \`\`\`
    `;

    try {
      console.log('Generating SerpApi payloads for recruiter query:', recruiterQuery);
      const { output } = await ai.generate({
        prompt: prompt,
        config: {
          temperature: 0.1
        },
        output: {
          schema: MultiPayloadOutputSchema,
        },
      });
      console.log('Generated SerpApi payloads successfully:', output);

      return output;
    } catch (error) {
      console.error('Error generating SerpApi payloads:', error);
      throw new Error(`Failed to generate SerpApi payloads: ${error.message}`);
    }
  }
);