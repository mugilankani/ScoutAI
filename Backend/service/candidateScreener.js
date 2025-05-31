// genkit-candidate-screener.ts
import * as genkit from '@genkit-ai/core';
import { defineFlow } from '@genkit-ai/flow';
import { text } from '@genkit-ai/ai'; // Assuming your AI model is configured

// Define the schema for the input from the user and SerpApi results
export interface SerpResultItem {
  position: number;
  title: string;
  link: string;
  snippet: string;
  snippet_highlighted_words?: string[]; // Optional, as it might not always be present
  source: string;
  // Add other fields you might find useful, e.g., "displayed_link"
}

export interface CandidateScreeningInput {
  recruiterQuery: string; // The original plain-English query from the recruiter
  serpResults: SerpResultItem[]; // An array of relevant organic_results from SerpApi
}

// Define the schema for the output (filtered and potentially ranked candidates)
export interface ScreenedCandidate {
  link: string;
  title: string;
  snippet: string;
  relevanceScore: number; // A score indicating how well it matches the query (0-100)
  reasonsForMatch: string; // Explanation of why it's a good match
  potentialRedFlags?: string; // Optional: Any identified discrepancies or minor mismatches
}

export interface CandidateScreeningOutput {
  filteredCandidates: ScreenedCandidate[];
  summary?: string; // Optional: General insights or notes from the LLM
}

// Define the Genkit Flow for candidate screening
export const screenCandidatesFlow = defineFlow(
  {
    name: 'screenCandidates',
    inputSchema: genkit.z.object({
      recruiterQuery: genkit.z.string(),
      serpResults: genkit.z.array(
        genkit.z.object({
          position: genkit.z.number(),
          title: genkit.z.string(),
          link: genkit.z.string(),
          snippet: genkit.z.string(),
          snippet_highlighted_words: genkit.z.array(genkit.z.string()).optional(),
          source: genkit.z.string(),
        })
      ),
    }),
    outputSchema: genkit.z.object({
      filteredCandidates: genkit.z.array(
        genkit.z.object({
          link: genkit.z.string(),
          title: genkit.z.string(),
          snippet: genkit.z.string(),
          relevanceScore: genkit.z.number().min(0).max(100),
          reasonsForMatch: genkit.z.string(),
          potentialRedFlags: genkit.z.string().optional(),
        })
      ),
      summary: genkit.z.string().optional(),
    }),
  },
  async (input: CandidateScreeningInput) => {
    const { recruiterQuery, serpResults } = input;

    // Construct the context for the LLM using the SerpApi snippets
    const candidatesContext = serpResults.map((result, index) => {
      const highlighted = result.snippet_highlighted_words ? ` (Keywords: ${result.snippet_highlighted_words.join(', ')})` : '';
      return `Candidate ${index + 1} (Link: ${result.link})\nTitle: ${result.title}\nSnippet: "${result.snippet}"${highlighted}\n---`;
    }).join('\n');

    const prompt = `
      You are an expert talent screener for a hiring copilot. Your task is to analyze a list of candidate search snippets retrieved from Google (via SerpApi) and filter/rank them based on an original recruiter's query.

      **Recruiter's Original Request:**
      "${recruiterQuery}"

      **Candidate Snippets (from SerpApi organic_results):**
      ${candidatesContext}

      **Instructions:**
      1.  **Evaluate Each Candidate:** For each candidate snippet, assess its relevance to the "Recruiter's Original Request." Consider the job role, skills, experience level, location, and any specific criteria (e.g., "contract work", "PhD", "remote").
      2.  **Focus on Snippet Content:** Base your assessment primarily on the 'title', 'snippet', and 'snippet_highlighted_words' from each candidate's search result. Do not invent information not present in the snippets.
      3.  **Filter Irrelevant Candidates:** Discard candidates who are clearly irrelevant (e.g., unrelated roles, missing key skills, wrong location/seniority if specified as strict criteria).
      4.  **Assign Relevance Score:** For each relevant candidate, assign a 'relevanceScore' from 0 (low) to 100 (high).
      5.  **Explain Match:** Provide concise 'reasonsForMatch' explaining *why* the candidate is relevant, referencing specific details from their snippet.
      6.  **Identify Potential Red Flags (Optional):** If a candidate seems generally relevant but has a minor mismatch or ambiguity in their snippet (e.g., location isn't precise, seniority is ambiguous, a key skill is implied but not explicit), add a short 'potentialRedFlags' note. If no red flags, omit this field.
      7.  **Output Format:** Return a single JSON object with two keys:
          * "filteredCandidates": An array of JSON objects, each representing a screened candidate.
          * "summary": An optional general summary of the candidate pool or any notable observations.

      **Screened Candidate Object Structure:**
      \`\`\`json
      {
        "link": "https://candidate-profile-link.com",
        "title": "Candidate's Job Title/Headline",
        "snippet": "Original search snippet",
        "relevanceScore": 85, // Integer between 0-100
        "reasonsForMatch": "Strong match for 'senior GenAI engineer' with 'LangChain' and 'RAG' experience explicitly mentioned in snippet.",
        "potentialRedFlags": "Location mentioned is 'Europe', but not a specific country within it." // Optional
      }
      \`\`\`

      **Expected JSON Output Example:**
      \`\`\`json
      {
        "filteredCandidates": [
          {
            "link": "https://uk.linkedin.com/in/danaitri",
            "title": "Danai Triantafyllidou - United Kingdom | Professional Profile",
            "snippet": "- Research on low-light video enhancement using Generative Adversarial networks (GANs) - Received the Best Internship Award. VITO Graphic. Research Intern.",
            "relevanceScore": 95,
            "reasonsForMatch": "Explicitly mentions 'Generative Adversarial networks (GANs)' and 'Research'. Good match for PhD in Computer Vision with GANs/Diffusion Models.",
            "potentialRedFlags": "Snippet indicates 'Research Intern', may not be PhD or senior enough if recruiter wants very experienced."
          },
          {
            "link": "https://fr.linkedin.com/in/mikegartrell",
            "title": "Mike Gartrell - Lead AI Research Scientist - Sigma Nova",
            "snippet": "I'm an AI researcher working on generative AI topics, including foundation models, large language models (LLMs), and diffusion models.",
            "relevanceScore": 100,
            "reasonsForMatch": "Perfect match: 'AI researcher', 'generative AI', 'diffusion models' directly address query. 'Lead AI Research Scientist' indicates seniority.",
            "potentialRedFlags": "Based in France, but recruiter requested UK. Could be a good candidate if open to relocation."
          }
        ],
        "summary": "The candidates found show strong relevance to Generative AI and diffusion/GAN models. Some are directly in the UK, others in Europe. Pay attention to specific experience level if 'PhD' is a strict requirement."
      }
      \`\`\`
    `;

    try {
      const llmResponse = await genkit.use(text).generate({
        prompt: prompt,
        config: {
          temperature: 0.2, // Keep low for structured, focused analysis
          maxTokens: 2000, // Increase for more detailed analysis and potential red flags
          responseMimeType: 'application/json', // Force JSON output
        },
      });

      const result = llmResponse.json() as CandidateScreeningOutput;

      // Basic validation of the parsed JSON
      if (!result || !Array.isArray(result.filteredCandidates)) {
        console.warn("LLM returned valid JSON but it did not conform to the expected 'filteredCandidates' array.");
        return { filteredCandidates: [], summary: "Failed to parse screening results." };
      }

      // Further filter/validate elements within the array if needed (e.g., ensure score is valid)
      result.filteredCandidates = result.filteredCandidates.filter(c => 
        typeof c.link === 'string' && c.link.startsWith('http') &&
        typeof c.title === 'string' && typeof c.snippet === 'string' &&
        typeof c.relevanceScore === 'number' && c.relevanceScore >= 0 && c.relevanceScore <= 100 &&
        typeof c.reasonsForMatch === 'string'
      );

      return result;

    } catch (error) {
      console.error("Error screening candidates:", error);
      throw new Error(`Failed to screen candidates: ${error.message}`);
    }
  }
);