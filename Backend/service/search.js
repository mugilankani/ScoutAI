// service/serp-api-client.js

import axios from "axios";
import { writeFile } from "fs/promises";
import fs from "fs";
import path from "path";
// If SerpApiSearchPayload is used in the runtime logic of multiPayloadGenerator.js,
// then you'd import it. Otherwise, if it's only a type definition, you can
// rely on the inferred structure in JavaScript.
// We'll assume for now that its structure is implicitly understood from generateMultiPayloadsFlow.
// SerpResultItem interface is purely for TypeScript, so it's removed.

/**
 * Executes a series of search requests to the SerpApi Google Search API.
 *
 * @param {Array<object>} searchPayloads - An array of objects, each representing a SerpApi search payload.
 * @param {string} serpApiKey - Your SerpApi API key.
 * @param {boolean} [addFilterPresent=false] - Optional. If true, appends "-Present" to each search query.
 * @returns {Promise<Array<object>>} A Promise that resolves to an array of SerpResultItem objects (organic_results from all successful searches).
 */
export async function executeSerpSearches(
  searchPayloads,
  serpApiKey,
  addFilterPresent = false
) {
  searchPayloads = searchPayloads.slice(0, 1);
  const allOrganicResults = [];

  for (const payload of searchPayloads) {
    // Create a mutable copy of the payload to avoid modifying the original
    const currentPayload = { ...payload };

    // --- NEW LOGIC START ---
    if (addFilterPresent) {
      currentPayload.q = `${currentPayload.q} -Present`; // Append "-Present" to the query string
      console.log(
        `[SerpApiClient] Modifying query: "${payload.q}" to "${currentPayload.q}"`
      );
    }
    // --- NEW LOGIC END ---

    // Construct the parameters for the SerpApi request by combining the current payload with the API key
    const serpParams = { ...currentPayload, api_key: serpApiKey };

    console.log(`[SerpApiClient] Executing search for query: ${serpParams.q}`);

    try {
      const response = await axios.get("https://serpapi.com/search", {
        params: serpParams,
      });

      // Check if the response contains organic results and if it's an array
      if (
        response.data &&
        response.data.organic_results &&
        Array.isArray(response.data.organic_results)
      ) {
        // Map the raw organic_results to a simplified structure (equivalent to SerpResultItem)
        try {
          // Modify the file writing logic to use a non-watched directory
          const writeResults = (data, query) => {
            try {
              // Write to a tmp directory instead of the project root
              const tmpDir = path.join(process.cwd(), "tmp");

              // Create tmp directory if it doesn't exist
              if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
              }

              const filepath = path.join(
                tmpDir,
                `serp_results_${Date.now()}.json`
              );
              fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
              console.log(
                `[SerpApiClient] Successfully wrote results to ${filepath}`
              );
            } catch (error) {
              console.error(
                `[SerpApiClient] Failed to write results: ${error.message}`
              );
            }
          };
          writeResults(response.data, serpParams.q);
        } catch (fileError) {
          console.error(
            `[SerpApiClient] Failed to write results to file:`,
            fileError
          );
        }
        const results = response.data.organic_results.map((item) => ({
          position: item.position,
          title: item.title,
          link: item.link,
          snippet: item.snippet,
          // Optional field, only include if it exists
          ...(item.snippet_highlighted_words && {
            snippet_highlighted_words: item.snippet_highlighted_words,
          }),
          source: item.source,
        }));
        allOrganicResults.push(...results); // Add results to the collective array
        console.log(
          `[SerpApiClient] Successfully fetched ${results.length} results for: ${serpParams.q}`
        );
      } else {
        console.warn(
          `[SerpApiClient] No organic results found or unexpected response structure for query: ${serpParams.q}`
        );
        console.warn(
          `[SerpApiClient] Full response data: ${JSON.stringify(response.data)}`
        );
      }
    } catch (error) {
      // Handle Axios-specific errors (network issues, bad responses)
      if (axios.isAxiosError(error)) {
        console.error(
          `[SerpApiClient] Error fetching results for query '${serpParams.q}': ${error.message}`
        );
        if (error.response) {
          console.error(
            `[SerpApiClient] SerpApi Response Data: ${JSON.stringify(
              error.response.data
            )}`
          );
          console.error(
            `[SerpApiClient] SerpApi Status: ${error.response.status}`
          );
        }
      } else {
        // Handle any other unexpected errors
        console.error(
          `[SerpApiClient] An unexpected error occurred for query '${serpParams.q}':`,
          error
        );
      }
      // Continue to the next payload even if one fails, but log the error
    }
  }

  console.log(
    `[SerpApiClient] Completed all searches. Total organic results collected: ${allOrganicResults.length}`
  );
  return allOrganicResults;
}

// In JavaScript, you define the structure implicitly through usage or
// document it with JSDoc if you want to provide type-like information.
// The TypeScript interface SerpResultItem is removed as it's not valid JS syntax.
