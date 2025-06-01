// genkit-candidate-screener.ts
import { genkit } from "genkit";
import { z } from 'zod';
import dotenv from 'dotenv';
import { googleAI, gemini25FlashPreview0417 } from "@genkit-ai/googleai"; // Using the import style from the latter code

dotenv.config();

// Initialize Genkit AI
const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  model: gemini25FlashPreview0417, // Using a specific model as in the latter code
});

// Define the schema for the input from the user and SerpApi results
const SerpResultItemSchema = z.object({
  position: z.number().describe('The position of the search result.'),
  title: z.string().describe('The title of the search result.'),
  link: z.string().url().describe('The URL of the search result.'),
  snippet: z.string().describe('A short summary of the content of the search result.'),
  snippet_highlighted_words: z.array(z.string()).optional().describe('Optional: Keywords highlighted in the snippet.'),
  source: z.string().optional().describe('The source of the search result (e.g., LinkedIn, GitHub).'),
});

const CandidateScreeningInputSchema = z.object({
  recruiterQuery: z.string().describe('The original plain-English query from the recruiter.'),
  serpResults: z.array(SerpResultItemSchema).describe('An array of relevant organic_results from SerpApi.'),
});

// Define the schema for the output (filtered and potentially ranked candidates)
const ScreenedCandidateSchema = z.object({
  link: z.string().describe('The link to the candidate\'s profile or relevant page.'),
  title: z.string().describe('The candidate\'s job title or headline from the search result.'),
  snippet: z.string().describe('The original search snippet for the candidate.'),
  relevanceScore: z.number().min(0).max(100).describe('A score (0-100) indicating how well the candidate matches the query.'),
  reasonsForMatch: z.string().describe('An explanation of why the candidate is a good match.'),
  potentialRedFlags: z.string().optional().describe('Optional: Any identified discrepancies or minor mismatches.'),
});

const CandidateScreeningOutputSchema = z.object({
  filteredCandidates: z.array(ScreenedCandidateSchema).describe('An array of screened and relevant candidates.'),
  summary: z.string().optional().describe('Optional: General insights or notes from the LLM about the candidate pool.'),
});

// Define the Genkit Flow for candidate screening
export const screenCandidatesFlow = ai.defineFlow( // Using ai.defineFlow as in the latter code
  {
    name: 'screenCandidates',
    description: 'Screens and ranks candidates based on recruiter queries and search results.',
    inputSchema: CandidateScreeningInputSchema,
    outputSchema: CandidateScreeningOutputSchema,
  },
  async ({ recruiterQuery, serpResults }) => {
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
      const { output } = await ai.generate({ // Using ai.generate as in the latter code
        prompt: prompt,
        config: {
          temperature: 0.2
        },
        output: {
          schema: CandidateScreeningOutputSchema, // Using schema for output validation
        },
      });

      return output;

    } catch (error) {
      console.error('Error screening candidates:', error);
      throw new Error(`Failed to screen candidates: ${error.message}`);
    }
  }
);