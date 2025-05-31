// File: services/genkitService.js
import { genkit } from "genkit";
import {
  googleAI,
  gemini20Flash,
  gemini25FlashPreview0417,
} from "@genkit-ai/googleai";
import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();
// GENKIT SETUP
const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  model: gemini20Flash,
});

const aiOutputSchema = z.object({
  scoring: z.array(
    z.object({
      email: z.string().describe("Email of the candidate"),
      score: z.number().min(0).max(10).describe("Score out of 10 in float"),
      WhyHeSuits: z.string().describe("Why the candidate suits the job"),
    })
  ),
});

export const scoringCriteria = ai.defineFlow(
  {
    name: "scoringCriteria",
    description: "Scores a document based on predefined criteria",
    InputSchema: z.object({
      dataOfpeople: z.string().describe("ID of the document to score"),
      userQury: z.string().describe("User query for scoring criteria"),
    }),
    OutputSchema: z.object({
      jsonOutput: z.string().describe("Scoring criteria output in JSON format"),
    }),
  },
  async ({ dataOfpeople, userQury }) => {
    const { output } = await ai.generate({
      prompt: `You are an expert in scoring resumes based on user queries. 
        Given the all the users shotlisted "${dataOfpeople}" and the user query "${userQury}", 
        provide a detailed scoring criteria in JSON format. Score then outof 10.00 in float 
        How much the candidate sute for the manager they searching for this and why the candidate suits the job.
        `,
      model: gemini25FlashPreview0417,
      output: { schema: aiOutputSchema },
    });

    return {
      jsonOutput: output, // structured output, not stringified
    };
  }
);
