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

// Outreach message flow
export const outReachMessage = ai.defineTool(
  {
    name: "outReachMessage",
    description: `Generates a highly personalized outreach message for a candidate, inviting them to interview for a specific role at a company.
Given the candidate's profile and company details, this tool crafts a professional, engaging message that references the candidate's unique skills and experiences, explains why the company is interested, and provides clear next steps.
Use this tool to automate and personalize candidate engagement for recruiting and talent acquisition.`,
    InputSchema: z.object({
      candidate: z.string(),
      companyDetails: z.string(),
    }),
    OutputSchema: z.object({
      fingerPrint: z.string().describe("Unique identifier for the candidate"),
      message: z.string(),
    }),
  },
  async ({ candidate, companyDetails }) => {
    const system = `
You are an expert technical recruiter and outreach specialist. Your job is to craft highly personalized, professional, and engaging outreach messages to candidates on behalf of a hiring company.
Use the candidate's profile and the company's details to make the message relevant, inviting, and clear about the opportunity.
Always address the candidate by name, mention specific skills or experiences from their profile, and clearly state the role and next steps.
Encourage the candidate to reply to this thread if interested.
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
`;

    const { output } = await ai.generate({
      system,
      prompt,
      output: {
        schema: z.object({
          fingerPrint: z.string(),
          message: z.string(),
        }),
      },
    });

    return output;
  }
);
