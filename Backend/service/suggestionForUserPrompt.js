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

// Test to make sure Gemini API key is set
if (!process.env.GEMINI_API_KEY) {
  console.error("WARNING: GEMINI_API_KEY environment variable is not set!");
}

// Create a simple mock function for testing when we don't need to call the real API
export const mockSuggestPromptImprovements = async ({ userPrompt }) => {
  console.log("Using mock suggestion function");
  return {
    suggestions: [
      "Specify years of experience required",
      "Include specific technologies or frameworks",
      "Mention preferred location or time zone",
      "Add information about expected salary range",
    ],
    improvedPrompt: `Looking for ${
      userPrompt.includes("developer") ? "a developer" : "an expert"
    } with [specific skills] and [years of experience]. Location: [remote/onsite]. Experience with [technologies]. Availability: [full-time/part-time/contract].`,
  };
};

export const suggestPromptImprovements = ai.defineFlow(
  {
    name: "suggestPromptImprovements",
    description:
      "Analyzes a user prompt for a hiring/candidate search and suggests ways to make it more structured and specific (role, location, working mode, experience, tools, techniques, skills, etc).",
    InputSchema: z.object({
      userPrompt: z
        .string()
        .describe("The user's initial prompt or requirement"),
    }),
    OutputSchema: z.object({
      suggestions: z
        .array(z.string())
        .describe(
          "Suggestions to make the prompt more structured and specific"
        ),
      improvedPrompt: z
        .string()
        .describe(
          "A more structured and specific version of the user's prompt"
        ),
    }),
  },
  async ({ userPrompt }) => {
    const system = `
You are an expert technical recruiter and prompt engineer. Your job is to help users make their hiring or candidate search prompts more structured and specific, so that AI tools can return more accurate results.

For any given user prompt, analyze it and suggest improvements by identifying missing or vague details. Suggest the user specify things like:
- Role/title
- Location or remote/hybrid/onsite
- Years of experience or seniority
- Required tools, technologies, or techniques
- Must-have and nice-to-have skills
- Industry or domain
- Language requirements
- Certifications or education
- Any other relevant criteria

Return:
1. 4 Strong suggestions for what to clarify or add in bullet points.

`;

    const prompt = `
User Prompt:
"${userPrompt}"

Instructions:
- List suggestions for making this prompt more structured and specific.
- Then, rewrite the prompt in a more structured format, using placeholders (e.g., <role>, <location>, <skills>) for any missing details.
- Output as JSON with two fields: "suggestions" (array of strings) and "improvedPrompt" (string).
see if the user try any prompt, how and all it can be improve, that only we need to suggestion, make 4 buller points that have a heading and 10 words for each heading and that can be improve like this, or tell them to give more details.
`;

    try {
      const { output } = await ai.generate({
        system,
        prompt,
        output: {
          schema: z.object({
            suggestions: z.array(z.string()),
            improvedPrompt: z.string(),
          }),
        },
      });

      console.log("Gemini API response:", output);
      return output;
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      // Fall back to mock function if Gemini API fails
      return mockSuggestPromptImprovements({ userPrompt });
    }
  }
);
