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
  async ({ dataOfpeople, userQury }) => {
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
${userQury}

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
`;

    const { output } = await ai.generate({
      system,
      prompt,
      model: gemini25FlashPreview0417,
      output: { schema: aiOutputSchema },
    });

    return {
      jsonOutput: output,
    };
  }
);

/*system: `You are a Hiring Manager Agent that follows the ReAct (Reasoning + Acting) style. You have access to the following tools:

  • retrieveAndGenerateJsonAnswer  
  • scoringCriteria  
  • backgroundChecks  
  • generatePrescreenQuestions  
  • outReachMessage  

Your job is to take a manager’s hiring requirement, break the task into a sequence of “Thought → Action → Observation” steps, invoke the correct tool at each Action step, and assemble a final JSON array of candidate profiles with all required fields filled (fingerprint, score, prescreen questions, background-check results, outreach message, etc.). Always follow the pattern:

  Thought N: <brief reasoning>  
  Action N: <tool name + input>  
  Observation N: <tool output or “(mocked output)”>  

When you finish all required steps, output a single JSON array (conforming to the CandidateSchema) that lists each candidate object, including:
  • full_name, email, phone, location, summary, skills, experience_level, projects, certifications, achievements, education, profiles, source  
  • fingerPrint (unique ID string)  
  • scoring: { score (0–10), WhyHeSuits (short justification) }  
  • backgroundChecks: { isMatch (boolean), flagged (string[]), summary (string) }  
  • prescreening: { questions (string[5]) }  
  • outreach: { message (string) }  

If at any point you discover missing information needed to proceed (for example, no candidates returned by retrieve), revise your query or call retrieveAndGenerateJsonAnswer again until you have valid data to continue.  
`,
      prompt: `
      
<This is the Manager Requirement>
${input}
</Manager Requirement>

The hiring manager wants someone with:
- Strong LangChain and Python experience
- Based in India or willing to work remotely
- Senior-level background
- Strong GitHub presence

Thought 1: I need to clarify the query so the retriever can return more relevant candidates.
Action 1: retrieveAndGenerateJsonAnswer with:
"Find senior candidates with LangChain and Python experience, based in India or open to remote roles, and strong GitHub profiles."

Observation 1: Got a list of candidates, each with name, fingerprint, and detailed profile info.

Thought 2: Now I’ll evaluate each candidate's fit by sending the profiles to the scoringCriteria tool.
Action 2: scoringCriteria with the candidate list.

Observation 2: Got scores with 'score' and 'WhyHeSuits' fields, linked via fingerprint.

Thought 3: I’ll merge this score data with the original profiles using fingerprint as key.

Thought 4: Next, I need to verify background info such as GitHub consistency.
Action 4: backgroundChecks with the enriched candidate profiles.

Observation 4: Got checks per candidate – includes isMatch, flagged, and summary fields.

Thought 5: Generate 5 tailored screening questions for each candidate.
Action 5: generatePrescreenQuestions with the updated candidate list.

Observation 5: Got pre-screening questions per candidate.

Thought 6: Generate a personalized outreach message for each candidate.
Action 6: outReachMessage with full candidate profiles.

Observation 6: Got personalized outreach messages.

Final Output: Return enriched candidate array, merged and formatted as valid JSON.


<Example of how to go with the data >
      <manager requirement>
We need to fill a Senior Full-Stack Engineer role in Berlin. Must have:
  • 5+ years of backend experience (Node.js, Python) 
  • Strong frontend (React, TypeScript) skills 
  • Experience with AWS or GCP 
  • Fluent English 
  • Prefer candidates who have shipped a product at scale 

Reach out to all passive candidates first. 
</manager requirement>

<ReAct Steps to Follow>
Thought 1: I need to retrieve all potential candidate data matching “Senior Full-Stack Engineer Berlin.”  
Action 1: retrieveAndGenerateJsonAnswer({ query: "Senior Full-Stack Engineer 5+ yrs Node React AWS Berlin" })  
Observation 1: [Array of candidate objects, each with full_name, email, phone, location, summary, skills, experience_level, projects, certifications, achievements, education, profiles, source]

Thought 2: Now that I have a list of candidates, I must score them by skills, location match, and years of experience.  
Action 2: scoringCriteria({ candidates: <entire Observation 1 array> })  
Observation 2: [
  {
    fingerPrint: "abc123",
    full_name: "Alice Müller",
    score: 9.2,
    WhyHeSuits: "5 yrs backend + 3 yrs frontend, React/AWS projects, Berlin-based"
  },
  {
    fingerPrint: "def456",
    full_name: "Bob Schmidt",
    score: 7.8,
    WhyHeSuits: "4 yrs backend, 6 yrs frontend, GCP but currently located outside Germany"
  },
  …
]

Thought 3: I will merge the scores (Observation 2) back into my original candidate data by matching on fingerPrint.  
Action 3: (internally combine Observation 1 and Observation 2 → mergedCandidates)

Observation 3: [
  {
    fingerPrint: "abc123",
    full_name: "Alice Müller",
    email: “alice@example.com”,
    phone: “+49…”,
    location: “Berlin, Germany”,
    summary: “Senior engineer…”,
    skills: ["Node.js","React","AWS","TypeScript", …],
    experience_level: “Senior”,
    projects: […],
    certifications: […],
    achievements: […],
    education: […],
    profiles: { linkedin, github, portfolio },
    source: “LinkedIn”,
    scoring: { score: 9.2, WhyHeSuits: "5 yrs backend + 3 yrs frontend, React/AWS projects, Berlin-based" }
  },
  { … } 
]

Thought 4: Next I need to perform background checks on each candidate’s public profile (GitHub, LinkedIn) to verify details and flag any concerns.  
Action 4: backgroundChecks({ candidates: <mergedCandidates> })  
Observation 4: [
  {
    fingerPrint: "abc123",
    isMatch: true,
    flagged: [],
    summary: "GitHub contributions match resume, no red flags."
  },
  {
    fingerPrint: "def456",
    isMatch: false,
    flagged: ["Resume says AWS, but GitHub shows only GCP repos."],
    summary: "Inconsistent cloud experience."
  },
  …
]

Thought 5: I’ll attach the background check results back to each candidate object by matching on fingerPrint.  
Action 5: (internally merge Observation 3 and Observation 4 → bgCheckedCandidates)

Observation 5: [
  {
    fingerPrint: "abc123",
    … (all previous fields) …,
    backgroundChecks: { isMatch: true, flagged: [], summary: "GitHub contributions match resume, no red flags." }
  },
  { … }
]

Thought 6: Now I must generate five prescreen questions per candidate to assess them in an interview.  
Action 6: generatePrescreenQuestions({ candidates: <bgCheckedCandidates> })  
Observation 6: [
  {
    fingerPrint: "abc123",
    questions: [
      "Explain your largest Node.js microservice architecture.",
      "Describe how you optimized React rendering performance.",
      "How have you used AWS (Lambda, ECS) in production?",
      "What’s your approach to TypeScript type safety in a large codebase?",
      "Tell me about a 12-month project you delivered at scale."
    ]
  },
  {
    fingerPrint: "def456",
    questions: [
      "Detail your experience with Python backend frameworks.",
      "How do you manage cross-region deployments on GCP?",
      "Explain a challenge you faced scaling a React app.",
      "What testing frameworks do you prefer in TypeScript?",
      "How do you ensure code quality on your projects?"
    ]
  },
  …
]

Thought 7: Attach these questions back to each candidate’s record by matching fingerPrint.  
Action 7: (internally merge Observation 5 and Observation 6 → prescreenedCandidates)

Observation 7: [
  {
    fingerPrint: "abc123",
    … (all previous fields) …,
    prescreening: { questions: [ …5 questions… ] }
  },
  { … }
]

Thought 8: Finally, create a personalized outreach message for each candidate.  
Action 8: outReachMessage({ candidates: <prescreenedCandidates> })  
Observation 8: [
  {
    fingerPrint: "abc123",
    message: "Hi Alice—saw your extensive AWS/React work in Berlin. We have a Senior Full-Stack role that matches your profile. Would you be open to chatting this week?"
  },
  {
    fingerPrint: "def456",
    message: "Hi Bob—I notice you’ve built React/GCP solutions. We’re hiring a Senior Full-Stack Engineer in Berlin. Although you’re currently outside Germany, your skills are compelling. Are you open to relocating?"
  },
  …
]

Thought 9: Add each outreach message back to the candidate objects by matching fingerPrint, then assemble the final JSON array.  
Action 9: (internally merge Observation 7 and Observation 8 → finalCandidates)

Observation 9 (Final Output):
[
  {
    fingerPrint: "abc123",
    full_name: "Alice Müller",
    email: "alice@example.com",
    phone: "+49…",
    location: "Berlin, Germany",
    summary: "Senior engineer with 5+ years of backend (Node.js) and 3+ years of frontend (React)...",
    skills: ["Node.js","React","AWS","TypeScript", …],
    experience_level: "Senior",
    projects: [ … ],
    certifications: [ … ],
    achievements: [ … ],
    education: [ … ],
    profiles: { linkedin: "...", github: "...", portfolio: "..." },
    source: "LinkedIn",
    scoring: { score: 9.2, WhyHeSuits: "5 yrs backend + 3 yrs frontend, React/AWS projects, Berlin-based" },
    backgroundChecks: { isMatch: true, flagged: [], summary: "GitHub contributions match resume, no red flags." },
    prescreening: { questions: [ 
      "Explain your largest Node.js microservice architecture.",
      "Describe how you optimized React rendering performance.",
      "How have you used AWS (Lambda, ECS) in production?",
      "What’s your approach to TypeScript type safety in a large codebase?",
      "Tell me about a 12-month project you delivered at scale."
    ] },
    outreach: { message: "Hi Alice—saw your extensive AWS/React work in Berlin. We have a Senior Full-Stack role that matches your profile. Would you be open to chatting this week?" }
  },
  {
    fingerPrint: "def456",
    … (same structure for Bob) …
  },
  …
]

<Final Output>
Return the above array (finalCandidates) as the result (no extra text).  


</Example of how to go with the data>

      `,*/

/*


      export const backgroundChecks = ai.defineTool(
        {
          name: "backgroundChecks",
          description: `Performs automated background checks on an array of candidates by validating their claimed skills, experience, and projects against public GitHub data.
      For each candidate, this tool scrapes their GitHub profile (if available), compares it to their resume, and flags any discrepancies or suspicious claims.
      It returns a JSON array with each candidate's fingerprint, a match status, a list of flagged issues, and a summary of the background check.
      Use this tool to verify the authenticity of candidates' technical backgrounds and identify potential resume exaggerations.`,
          InputSchema: z.array(
            z.object({
              candidate: z.string().describe("Candidate data in JSON format"),
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
          console.log("Starting background checks for candidates:", candidate);
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
        async ({ dataOfpeople, userQury }) => {
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
      ${userQury}
      
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
      `;
      
          const { output } = await ai.generate({
            system,
            prompt,
            model: gemini25FlashPreview0417,
            output: { schema: aiOutputSchema },
          });
      
          return {
            jsonOutput: output,
          };
        }
      );

*/

/* that exposes all tools
export const agentParentFlow = ai.defineFlow(
  {
    name: "agentParentFlow",
    description:
      "Parent agent that gives access to all defined tools/flows for candidate processing.",
    InputSchema: z.object({
      input: z.string().describe("Input for the selected tool/flow"),
    }),
    OutputSchema: CandidateSchema,
  },
  async ({ input }) => {
    const output = await ai.generate({
      system: `You are a Hiring Manager Agent that follows the ReAct (Reasoning + Acting) style. Your task is to process a manager's hiring requirement and generate a JSON array of candidate profiles with all required fields filled.
`,
      prompt: `
Here is the manager's requirement:
<manager_requirement>
${input}
</manager_requirement>

You have access to the following tools:
• retrieveAndGenerateJsonAnswer
• scoringCriteria
• backgroundChecks
• generatePrescreenQuestions
• outReachMessage

Follow the ReAct process by breaking the task into a sequence of "Thought → Action → Observation" steps. For each step:

1. Thought N: Briefly explain your reasoning
2. Action N: Specify the tool name and input
3. Observation N: Record the tool output or "(mocked output)" if not available

Always use this format for each step:

Thought N: <brief reasoning>
Action N: <tool name + input>
Observation N: <tool output or "(mocked output)">

After completing all required steps, output a single JSON array that conforms to the CandidateSchema. Each candidate object should include:
• full_name, email, phone, location, summary, skills, experience_level, projects, certifications, achievements, education, profiles, source
• fingerPrint (unique ID string)
• scoring: { score (0–10), WhyHeSuits (short justification) }
• backgroundChecks: { isMatch (boolean), flagged (string[]), summary (string) }
• prescreening: { questions (string[5]) }
• outreach: { message (string) }

If you encounter missing information needed to proceed (e.g., no candidates returned by retrieve), revise your query or call retrieveAndGenerateJsonAnswer again until you have valid data to continue.

Here's an example of how to approach this task:

Thought 1: I need to retrieve candidate data matching the manager's requirements.
Action 1: retrieveAndGenerateJsonAnswer({ query: "<manager_requirement>" })
Observation 1: (Getting data from retrieveAndGenerateJsonAnswer in DB) [Array of candidate objects with relevant fields]

Thought 2: Now I need to score the candidates based on the manager's criteria.
Action 2: scoringCriteria({ candidates: <entire Observation 1 array> })
Observation 2: (mocked output) [Array of scored candidates with fingerPrint, score, and WhyHeSuits fields]

Continue this process, using the appropriate tools to gather all required information and enrich the candidate profiles. Make sure to merge new data with existing profiles using the fingerPrint as a key.

After completing all steps, output the final JSON array of candidate profiles with all required fields filled. Do not include any additional text or explanation outside of the JSON array.

Begin your process now, starting with Thought 1.

IMPORTANT
First YOU MUST call the "retrieveAndGenerateJsonAnswer" tool to get the initial candidates data by sending the user query to that tool as an input, using the format: { query: "<manager_requirement>" }.
      `,
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
    });
    // console.log("output",output.message.content)
    return output;
  }
);
 */
