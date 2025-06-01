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

// // Tool definition for GitHub scraping
// const githubScraperTool = ai.defineTool(
//   {
//     name: "githubScraper",
//     description: "Scrapes GitHub profile and returns summary data.",
//     inputSchema: z.object({
//       githubUrl: z.string().describe("GitHub profile URL"),
//     }),
//     outputSchema: z.object({
//       repos: z.number(),
//       languages: z.array(z.string()),
//       contributions: z.number(),
//       summary: z.string(),
//     }),
//   },
//   async ({ githubUrl }) => {
//     // Call the actual GitHub scraper function
//     const data = await githubScraper({ githubUrl });
//     return {
//       repos: data.repos,
//       languages: data.languages,
//       contributions: data.contributions,
//       summary: data.summary,
//     };
//   }
// );

// Prescreening flow
export const backgroundChecks = ai.defineTool(
  {
    name: "backgroundChecks",
    description: `Performs automated background checks on an array of candidates by validating their claimed skills, experience, and projects against public GitHub data.
For each candidate, this tool scrapes their GitHub profile (if available), compares it to their resume, and flags any discrepancies or suspicious claims.
It returns a JSON array with each candidate's fingerprint, a match status, a list of flagged issues, and a summary of the background check.
Use this tool to verify the authenticity of candidates' technical backgrounds and identify potential resume exaggerations.`,
    InputSchema: z.array(
      z.object({
        candidate: z.string(),
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
  async ({ candidate }) => {
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
${JSON.stringify(candidate, null, 2)}
</Candidates data>
`;

    const { output } = await ai.generate({
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
    });

    return output;
  }
);
