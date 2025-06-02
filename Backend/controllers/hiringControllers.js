import { generateMultiPayloadsFlow } from "../service/multiPayloadGenerator.js";
import { executeSerpSearches } from "../service/search.js";
import { screenCandidatesFlow } from "../service/candidateScreener.js";
import { fetchLinkedInProfiles } from "../service/linkedInScraper.js";
import { agentParentFlow } from "../service/agentParent.js";
import dotenv from "dotenv";
// Fix the Firebase import - import the admin object directly
import admin from "../firebase.js"; // Changed from firestore import

dotenv.config();

const SERPAPI_KEY = process.env.SERPAPI_API_KEY;
const GOOGLE_AI_KEY = process.env.GOOGLE_API_KEY;
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

// Create a firestore variable or provide a mock for development
let firestore;
try {
  firestore = admin.firestore();
  console.log("Firestore initialized successfully");
} catch (error) {
  console.warn("Firestore not initialized:", error.message);
  // Mock firestore for development/testing
  firestore = {
    collection: () => ({
      doc: () => ({
        update: async () => console.log("Mock firestore update called"),
      }),
    }),
  };
}

// Helper to update progress in Firestore
const updateSearchProgress = async (
  searchId,
  progress,
  statusMessage,
  status = "processing",
  results = null
) => {
  try {
    console.log(`Search ${searchId}: [${progress}%] ${statusMessage}`);
    await firestore
      .collection("searches")
      .doc(searchId)
      .update({
        progress,
        status,
        statusMessage,
        updatedAt: new Date().toISOString(),
        ...(results && { results }),
      });
  } catch (error) {
    console.error(`Failed to update progress for search ${searchId}:`, error);
    // Don't let logging failure stop the main process, but log it
  }
};

export const findCandidatesAndFetchProfiles = async (
  recruiterQuery,
  filterPresent,
  searchId,
  userId
) => {
  // Log the user ID being received to debug
  console.log(
    `Search ${searchId}: Processing request for user ID: ${
      userId || "anonymous"
    }`
  );

  if (!recruiterQuery) {
    throw new Error("Recruiter query is required.");
  }
  if (!SERPAPI_KEY || !GOOGLE_AI_KEY || !APIFY_TOKEN) {
    const errorMsg =
      "API keys not configured. Please check server environment variables.";
    console.error(errorMsg);
    // Update Firestore with this critical configuration error before throwing
    await updateSearchProgress(
      searchId,
      0,
      `Configuration Error: ${errorMsg}`,
      "failed"
    );
    throw new Error(errorMsg);
  }

  try {
    await updateSearchProgress(searchId, 5, "Generating search queries...");
    const serpPayloads = await generateMultiPayloadsFlow({ recruiterQuery });
    console.log(
      `Search ${searchId}: Generated SerpApi payloads:`,
      serpPayloads.serp.length
    );

    await updateSearchProgress(
      searchId,
      10,
      `Scout Executing ${serpPayloads.serp.length} web searches...`
    );
    const rawSerpResults = await executeSerpSearches(
      serpPayloads.serp,
      SERPAPI_KEY,
      filterPresent
    );
    console.log(
      `Search ${searchId}: Received ${rawSerpResults.length} raw search results.`
    );

    await updateSearchProgress(
      searchId,
      25,
      "Scout Screening initial candidates from search results..."
    );
    const { filteredCandidates, summary } = await screenCandidatesFlow({
      recruiterQuery: recruiterQuery,
      serpResults: rawSerpResults,
    });
    console.log(
      `Search ${searchId}: Screened ${filteredCandidates.length} candidates based on snippets.`
    );

    const linkedInUrlsToScrape = filteredCandidates
      .map((candidate) => {
        const linkedInMatch = candidate.link.match(
          /linkedin\.com\/in\/[^\/?#]+/i
        ); // Improved regex
        return linkedInMatch ? linkedInMatch[0] : null;
      })
      .filter(
        (url, index, self) => url !== null && self.indexOf(url) === index
      ); // Unique URLs

    if (linkedInUrlsToScrape.length === 0) {
      console.warn(
        `Search ${searchId}: No valid LinkedIn profile URLs found to scrape after initial screening.`
      );
      await updateSearchProgress(
        searchId,
        90,
        "No LinkedIn profiles found for detailed scraping. Finalizing with initial results."
      );
      return {
        message:
          "No LinkedIn profiles found for detailed scraping. Returning initially screened candidates.",
        summary: summary,
        screenedCandidates: filteredCandidates,
        finalResult: filteredCandidates, // Or an empty array / specific structure
      };
    }
    console.log(
      `Search ${searchId}: Identified ${linkedInUrlsToScrape.length} unique LinkedIn profiles for scraping.`
    );

    await updateSearchProgress(
      searchId,
      50,
      `Scout Fetching ${linkedInUrlsToScrape.length} LinkedIn profiles...`
    );
    const fullLinkedInProfiles = await fetchLinkedInProfiles(
      linkedInUrlsToScrape,
      APIFY_TOKEN
    );
    console.log(
      `Search ${searchId}: Successfully fetched ${fullLinkedInProfiles.length} full LinkedIn profiles.`
    );

    // Check if any profiles were actually fetched
    if (!fullLinkedInProfiles || fullLinkedInProfiles.length === 0) {
      console.warn(
        `Search ${searchId}: No LinkedIn profiles were successfully scraped. Finalizing with screened candidates.`
      );
      await updateSearchProgress(
        searchId,
        90,
        "No LinkedIn profiles were successfully scraped. Finalizing with screened candidates."
      );
      return {
        message:
          "No LinkedIn profiles were successfully scraped. Finalizing with screened candidates.",
        summary: summary,
        screenedCandidates: filteredCandidates,
        finalResult: [], // or filteredCandidates if that's the fallback
      };
    }

    await updateSearchProgress(
      searchId,
      65,
      "Scout is Analyzing and finalizing candidate data...(This May take few Minutes)"
    );
    const finalResult = await agentParentFlow({
      input: recruiterQuery,
      candidates: fullLinkedInProfiles,
    });
    console.log(`Search ${searchId}: Agent parent flow completed.`);
    await updateSearchProgress(
      searchId,
      100,
      "Final results Are ready😅...",
      finalResult
    );

    // The .then() in server.js will set progress to 100 and status to 'completed'
    return {
      message:
        "Candidate search, screening, and profile fetching completed successfully.",
      summary: summary,
      screenedCandidates: filteredCandidates,
      finalResult: finalResult,
    };
  } catch (error) {
    console.error(
      `Error in candidate processing pipeline for search ${searchId}:`,
      error
    );
    // The .catch() in server.js will update Firestore with the failure.
    // We just re-throw the error here.
    throw error; // Re-throw original error to be caught by the caller in server.js
  }
};

// Add a wrapper function that extracts the user ID from the request properly
export const handleCandidatesSearch = async (req, res) => {
  try {
    // Extract userId from request and use a default if not provided
    const { recruiterQuery, filterPresent = false, userId } = req.body;
    const effectiveUserId =
      userId || req.user?.uid || req.user?.id || "anonymous";

    console.log(`Received search request with userId: ${effectiveUserId}`);

    // Generate a unique searchId
    const searchId = `search-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    // Create initial record in Firestore
    await firestore.collection("searches").doc(searchId).set({
      searchId,
      query: recruiterQuery,
      filterPresent,
      userId: effectiveUserId, // Use the effective user ID
      status: "pending",
      progress: 0,
      statusMessage: "Search request received, initializing...",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Return immediate acknowledgment to client
    res.status(202).json({
      message: "Search request accepted",
      searchId,
      status: "pending",
      initialData: {
        progress: 0,
        statusMessage: "Search initialization in progress...",
      },
    });

    // Process the search asynchronously
    findCandidatesAndFetchProfiles(
      recruiterQuery,
      filterPresent,
      searchId,
      effectiveUserId
    )
      .then((result) => {
        // Update Firestore with completed status
        firestore.collection("searches").doc(searchId).update({
          status: "completed",
          progress: 100,
          statusMessage: "Search completed successfully",
          results: result,
          updatedAt: new Date().toISOString(),
        });
        console.log(`Search ${searchId}: Completed successfully`);
      })
      .catch((error) => {
        console.error(`Search ${searchId}: Failed with error:`, error);
        firestore
          .collection("searches")
          .doc(searchId)
          .update({
            status: "failed",
            statusMessage: `Error: ${error.message || "Unknown error"}`,
            error: error.message || "An unknown error occurred",
            updatedAt: new Date().toISOString(),
          });
      });
  } catch (error) {
    console.error("Error handling search request:", error);
    res.status(500).json({
      error: "Failed to process search request",
      details: error.message,
    });
  }
};
