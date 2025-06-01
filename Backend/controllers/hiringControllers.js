// controllers/hiringController.js

// Import necessary modules
// Note: The file extensions are omitted in imports for brevity,
// but in a real Node.js environment, you might need '.js' or '.mjs'
// depending on your module system configuration.
import { generateMultiPayloadsFlow } from "../service/multiPayloadGenerator.js"; // Assuming this is genkit-multi-payload-generator.ts compiled to JS
import { executeSerpSearches } from "../service/search.js"; // Assuming this is serp-api-client.ts compiled to JS
import { screenCandidatesFlow } from "../service/candidateScreener.js"; // Assuming this is genkit-candidate-screener.ts compiled to JS
import { fetchLinkedInProfiles } from "../service/linkedInScraper.js"; // Assuming this is linkedin-scraper-client.ts compiled to JS
import dotenv from "dotenv";
import { agentParentFlow } from "../service/agentParent.js";

// Load environment variables from .env file
dotenv.config();

// Retrieve API keys from environment variables
const SERPAPI_KEY = process.env.SERPAPI_API_KEY;
const GOOGLE_AI_KEY = process.env.GOOGLE_API_KEY;
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

/**
 * Controller function to handle the end-to-end candidate search and profile fetching.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
export const findCandidatesAndFetchProfiles = async (req, res) => {
  // Destructure recruiterQuery from request body, with filterPresent defaulting to false
  const { recruiterQuery, filterPresent = false } = req.body;

  // Input validation: Check if recruiterQuery is provided
  if (!recruiterQuery) {
    return res.status(400).json({ error: "Recruiter query is required." });
  }

  // API Key validation: Check if all necessary API keys are configured
  if (!SERPAPI_KEY || !GOOGLE_AI_KEY || !APIFY_TOKEN) {
    console.error(
      "Missing API keys. Ensure SERPAPI_API_KEY, GOOGLE_API_KEY, and APIFY_API_TOKEN are set."
    );
    return res.status(500).json({
      error:
        "API keys not configured. Please check server environment variables.",
    });
  }

  try {
    // Step 1: Generate SerpApi payloads using the Genkit LLM flow
    // The .run() method returns the output as defined in the Genkit flow's outputSchema.
    const serpPayloads = await generateMultiPayloadsFlow({
      recruiterQuery: recruiterQuery,
    });
    console.log("Generated SerpApi payloads:", serpPayloads);

    // Step 2: Execute SerpApi searches using the dedicated client
    // Pass the 'serp' array from the Genkit output and the SerpApi key, along with the filterPresent flag.
    const rawSerpResults = await executeSerpSearches(
      serpPayloads.serp, // Accessing the 'serp' array from the structured output
      SERPAPI_KEY,
      filterPresent
    );

    // // Step 3: Screen and filter candidates based on snippets using another Genkit LLM flow
    // Pass the original recruiter query and the raw SerpApi results for screening.
    const { filteredCandidates, summary } = await screenCandidatesFlow({
      recruiterQuery: recruiterQuery,
      serpResults: rawSerpResults,
    });

    console.log(filteredCandidates);
    console.log(
      `Screened ${filteredCandidates.length} candidates based on the recruiter query.`
    );

    // Step 4: Extract LinkedIn URLs from the filtered candidates for detailed scraping
    const linkedInUrlsToScrape = filteredCandidates
      .map((candidate) => {
        // Basic regex to ensure it's a LinkedIn profile URL
        // This regex extracts the base LinkedIn profile URL (e.g., linkedin.com/in/username)
        const linkedInMatch = candidate.link.match(
          /linkedin\.com\/in\/[^\/]+/i
        );
        return linkedInMatch ? linkedInMatch[0] : null; // Return the matched URL or null
      })
      .filter((url) => url !== null); // Filter out any null values (non-LinkedIn URLs)

    // Check if any valid LinkedIn URLs were found for scraping
    if (linkedInUrlsToScrape.length === 0) {
      console.warn(
        "No valid LinkedIn profile URLs found to scrape after initial screening."
      );
      // If no profiles to scrape, return the already screened candidates.
      return res.status(200).json({
        message:
          "No LinkedIn profiles found for detailed scraping. Returning initially screened candidates.",
        summary: summary,
        candidates: filteredCandidates, // Return already screened candidates
      });
    }

    // Step 5: Fetch full LinkedIn profiles using the Apify client
    // Pass the extracted LinkedIn URLs and the Apify token.
    const fullLinkedInProfiles = await fetchLinkedInProfiles(
      linkedInUrlsToScrape,
      APIFY_TOKEN
    );

    console.log(
      `Successfully fetched ${fullLinkedInProfiles.length} full LinkedIn profiles from Apify.`
    );

    console.log("parsed linked in profile", fullLinkedInProfiles);
    const finalResult = await agentParentFlow({
      input: recruiterQuery,
      candidates: fullLinkedInProfiles,
    });

    // Respond with the comprehensive results: summary, initially screened candidates,
    // and the detailed full LinkedIn profiles.

    res.status(200).json({
      message:
        "Candidate search, screening, and profile fetching completed successfully.",
      summary: summary,
      screenedCandidates: filteredCandidates, // The candidates with relevance score/reasons from snippet analysis
      finalResult: finalResult, // The final result from the agent parent flow
    });
  } catch (error) {
    // Centralized error handling for the entire pipeline
    console.error("Error in candidate processing pipeline:", error);
    // Respond with a 500 status code and an error message
    res.status(500).json({
      error: "Failed to process candidate search and profile fetching.",
      details: error.message || "An unknown error occurred.", // Provide error details if available
    });
  }
};

// REMOVE THIS - direct function call won't work for Express controllers
// const result  = await findCandidatesAndFetchProfiles({
//   "recruiterQuery": "Senior AI/ML Engineer with expertise in Large Language Models (LLMs), TensorFlow, PyTorch, and deploying models on GCP, based in New York, open to remote work.",
//   "filterPresent": true
// });
