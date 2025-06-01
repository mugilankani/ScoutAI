// service/linkedin-scraper-client.js

import axios from "axios";

/**
 * Fetches full LinkedIn profiles using the Apify LinkedIn Profile Scraper (async/polling pattern).
 *
 * @param {string[]} profileUrls - An array of LinkedIn profile URLs to scrape.
 * @param {string} apifyToken - Your Apify API token.
 * @param {object} options - Optional: { pollIntervalMs, maxWaitMs }
 * @returns {Promise<Array<object>>} A Promise that resolves to an array of objects,
 * each representing a detailed LinkedIn profile.
 */
export async function fetchLinkedInProfiles(profileUrls, apifyToken, options = {}) {
  if (!profileUrls || profileUrls.length === 0) {
    console.warn("[LinkedInScraperClient] No profile URLs provided to scrape.");
    return [];
  }

  const pollIntervalMs = options.pollIntervalMs || 15000; // 15 seconds
  const maxWaitMs = options.maxWaitMs || 10 * 60 * 1000; // 10 minutes

  // 1. Start the Apify actor run (async)
  const startRunUrl = "https://api.apify.com/v2/acts/dev_fusion~linkedin-profile-scraper/runs";
  let runId, datasetId;

  try {
    const startRes = await axios.post(
      startRunUrl,
      {
        profileUrls: profileUrls,
      },
      {
        params: { token: apifyToken },
        headers: { "Content-Type": "application/json" },
      }
    );
    runId = startRes.data.data.id;
    datasetId = startRes.data.data.defaultDatasetId;
    console.log(`[LinkedInScraperClient] Started Apify run: ${runId}, dataset: ${datasetId}`);
  } catch (error) {
    console.error("[LinkedInScraperClient] Failed to start Apify actor run:", error.message);
    throw new Error(`Failed to start Apify actor run: ${error.message}`);
  }

  // 2. Poll for run completion
  const runStatusUrl = `https://api.apify.com/v2/actor-runs/${runId}`;
  let elapsed = 0;
  let status = "RUNNING";
  while (status === "RUNNING" || status === "READY") {
    if (elapsed > maxWaitMs) {
      throw new Error("Apify run timed out waiting for completion.");
    }
    let retries = 0;
    while (retries < 3) {
      try {
        const statusRes = await axios.get(runStatusUrl, {
          params: { token: apifyToken },
        });
        status = statusRes.data.data.status;
        if (status === "SUCCEEDED") {
          break;
        }
        if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
          throw new Error(`Apify run ended with status: ${status}`);
        }
        break; // exit retry loop if successful
      } catch (err) {
        retries++;
        if (retries >= 3) {
          console.error("[LinkedInScraperClient] Error polling Apify run status after 3 retries:", err.message);
          throw new Error(`Error polling Apify run status: ${err.message}`);
        }
        console.warn(`[LinkedInScraperClient] Polling failed (attempt ${retries}), retrying in 5s...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    elapsed += pollIntervalMs;
    console.log(`[LinkedInScraperClient] Waiting for Apify run to finish... (${elapsed / 1000}s elapsed)`);
  }

  // 3. Fetch dataset items
  const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items`;
  try {
    const datasetRes = await axios.get(datasetUrl, {
      params: { token: apifyToken, clean: true, format: "json" },
      timeout: 2 * 60 * 1000, // 2 minutes
    });
    if (Array.isArray(datasetRes.data)) {
      console.log(`[LinkedInScraperClient] Successfully fetched ${datasetRes.data.length} profiles from Apify.`);
      return datasetRes.data;
    } else {
      console.warn("[LinkedInScraperClient] Apify dataset response is not an array:", datasetRes.data);
      return [];
    }
  } catch (error) {
    console.error("[LinkedInScraperClient] Error fetching Apify dataset items:", error.message);
    throw new Error(`Failed to fetch LinkedIn profiles from Apify dataset: ${error.message}`);
  }
}
