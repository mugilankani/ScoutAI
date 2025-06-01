import { genkit, z } from "genkit";
import { googleAI, gemini20Flash } from "@genkit-ai/googleai";
import dotenv from "dotenv";
dotenv.config();

const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  model: gemini20Flash,
});

export const generatePrescreenQuestions = ai.defineTool(
  {
    name: "generatePrescreenQuestions",
    description: `Creates 5 tailored prescreening interview questions for a candidate and a specific job role.
Given candidate details and a user query (such as a job description), this tool generates insightful, role-specific questions to assess the candidate's fit.
The questions are customized to the candidate's background and the requirements of the role, and returned as an array with the candidate's name and fingerprint.
Use this tool to prepare effective prescreening interviews for any candidate-role combination.`,
    InputSchema: z.object({
      candidate: z.string().optional(),
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
`;

    const { output } = await ai.generate({
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
    });

    return output;
  }
);
