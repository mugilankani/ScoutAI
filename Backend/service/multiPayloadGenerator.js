// genkit-multi-payload-generator.ts
import * as genkit from '@genkit-ai/core';
import { defineFlow } from '@genkit-ai/flow';
import { text } from '@genkit-ai/ai'; // Assuming your AI model is configured

// Define the schema for the input and output
export interface MultiPayloadInput {
  recruiterQuery: string; // e.g., "Find senior Gen-AI engineers with LangChain + RAG experience in Europe, open to contract work"
}

export interface SerpApiLocationPayload {
  q: string;
}

export interface SerpApiSearchPayload {
  engine: "google_light" | "google";
  q: string; // The search query string, no quotes around keywords
  location?: string; // Specific location for the search, optional
  google_domain?: string; // e.g., "google.com"
  hl?: string; // Language code (e.g., "en")
  gl?: string; // Country code (e.g., "us")
  api_key?: string; // Will be passed externally, include in type for clarity
}

export interface MultiPayloadOutput {
  location: SerpApiLocationPayload[];
  serp: SerpApiSearchPayload[];
}

// Define the Genkit Flow
export const generateMultiPayloadsFlow = defineFlow(
  {
    name: 'generateMultiPayloads',
    inputSchema: genkit.z.object({
      recruiterQuery: genkit.z.string(),
    }),
    outputSchema: genkit.z.object({
      location: genkit.z.array(
        genkit.z.object({
          q: genkit.z.string(),
        })
      ),
      serp: genkit.z.array(
        genkit.z.object({
          engine: genkit.z.union([genkit.z.literal("google_light"), genkit.z.literal("google")]),
          q: genkit.z.string(),
          location: genkit.z.string().optional(),
          google_domain: genkit.z.string().optional(),
          hl: genkit.z.string().optional(),
          gl: genkit.z.string().optional(),
          api_key: genkit.z.string().optional(),
        })
      ),
    }),
  },
  async (input: MultiPayloadInput) => {
    const { recruiterQuery } = input;

    // The comprehensive prompt for the LLM
    const prompt = `
      You are an expert search query generator for a talent acquisition platform, specifically designed to create JSON payloads for the SerpApi Google search engine. Your task is to transform a recruiter's natural language request into a structured JSON response that includes:

      1.  A SerpApi Locations API payload (when a specific city/state/region is provided), and
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
              * For search payloads, use the specific location in the 'location' field if it significantly improves search quality for that query.
          * **If the location is broad (e.g., "India", "Europe", "US", "UK"):**
              * The 'location' array should be **empty**.
              * Use the country directly in the 'gl' (geographical location) field of the SerpApi search payloads where appropriate. For "Europe," generate payloads for key countries like Germany, France, UK, Netherlands, etc., setting their respective 'gl' and 'google_domain'.

      3.  **Generate 5–10 Distinct SerpApi Search Payloads (for the 'serp' array):**
          * Each payload MUST be a JSON object with this structure:
              \`\`\`json
              {
                "engine": "google_light",
                "q": "Google search query here",
                "location": "Optional – only if very specific city/state/region to improve search precision",
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
            "location": "Germany",
            "google_domain": "google.de",
            "hl": "en",
            "gl": "de"
          },
          {
            "engine": "google_light",
            "q": "site:linkedin.com/in AI Engineer LangChain RAG France (python OR tensorflow)",
            "location": "Paris, France",
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
      const llmResponse = await genkit.use(text).generate({
        prompt: prompt,
        config: {
          temperature: 0.1, // Even lower temp for stricter adherence to JSON
          maxTokens: 1500,  // Increased max tokens for more complex output
          // responseMimeType: 'application/json' // If your LLM provider/Genkit supports this for stricter JSON
        },
      });

      const responseText = llmResponse.text();
      
      let resultPayload: MultiPayloadOutput;
      try {
        resultPayload = JSON.parse(responseText) as MultiPayloadOutput;
      } catch (parseError) {
        console.error("Failed to parse LLM response as JSON. Response:", responseText, "Error:", parseError);
        // Robust fallback: Attempt to find the main JSON object
        const jsonMatch = responseText.match(/{\s*"location":[^]*"serp":[^]*}/s);
        if (jsonMatch && jsonMatch[0]) {
          try {
            resultPayload = JSON.parse(jsonMatch[0]) as MultiPayloadOutput;
          } catch (fallbackParseError) {
            console.error("Fallback JSON parsing failed:", fallbackParseError);
            throw new Error("LLM did not return valid JSON and fallback failed.");
          }
        } else {
          throw new Error("LLM did not return a valid JSON object with 'location' and 'serp' keys.");
        }
      }

      // Basic validation for the top-level keys
      if (!resultPayload || !Array.isArray(resultPayload.location) || !Array.isArray(resultPayload.serp)) {
        console.warn("LLM did not return the expected top-level 'location' and 'serp' arrays. Returning empty.");
        return { location: [], serp: [] };
      }

      // Further validation for 'serp' array items (optional, but good practice)
      resultPayload.serp = resultPayload.serp.filter(p => typeof p === 'object' && 'q' in p && 'engine' in p);

      return resultPayload;
    } catch (error) {
      console.error("Error generating SerpApi payloads:", error);
      throw new Error(`Failed to generate SerpApi payloads: ${error.message}`);
    }
  }
);