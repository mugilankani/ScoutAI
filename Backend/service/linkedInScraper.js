// service/linkedin-scraper-client.js

import axios from 'axios';

/**
 * Fetches full LinkedIn profiles using the Apify LinkedIn Profile Scraper.
 *
 * @param {string[]} profileUrls - An array of LinkedIn profile URLs to scrape.
 * @param {string} apifyToken - Your Apify API token.
 * @returns {Promise<Array<object>>} A Promise that resolves to an array of objects,
 * each representing a detailed LinkedIn profile.
 */
export async function fetchLinkedInProfiles(
  profileUrls,
  apifyToken
) {
  if (!profileUrls || profileUrls.length === 0) {
    console.warn('[LinkedInScraperClient] No profile URLs provided to scrape.');
    return [];
  }

  // Apify endpoint for running the LinkedIn Profile Scraper and getting dataset items
  const apifyEndpoint = 'https://api.apify.com/v2/acts/dev_fusion~linkedin-profile-scraper/run-sync-get-dataset-items';

  console.log(`[LinkedInScraperClient] Initiating Apify scraper for ${profileUrls.length} profiles.`);

  try {
    const response = await axios.post(apifyEndpoint, {
      profileUrls: profileUrls,
      // You can add other Apify scraper input parameters here if needed
      // For example, to scrape only a certain number of posts per profile:
      // maxPosts: 5,
    }, {
      params: {
        token: apifyToken,
        // The 'run-sync-get-dataset-items' implies it waits for completion,
        // but you might want to explicitly set a wait time for very long jobs.
        // waitSecs: 300, // Example: wait up to 5 minutes for the scraper to finish
      },
      headers: {
        'Content-Type': 'application/json',
      },
      // Set a generous timeout for the API call as scraping can take time
      timeout: 600 * 1000, // 10 minutes timeout to allow for scraping
    });

    // Check if the response contains data and is an array of profiles
    if (response.data && Array.isArray(response.data)) {
      console.log(`[LinkedInScraperClient] Successfully fetched ${response.data.length} profiles from Apify.`);
      return response.data; // The data directly maps to the desired profile structure
    } else {
      console.warn('[LinkedInScraperClient] Apify response did not contain an array of profile data or was empty:', response.data);
      return []; // Return an empty array if no valid data is found
    }
  } catch (error) {
    // Check if the error is an Axios error (e.g., network issues, HTTP errors)
    if (axios.isAxiosError(error)) {
      console.error(`[LinkedInScraperClient] Error fetching LinkedIn profiles from Apify: ${error.message}`);
      if (error.response) {
        // Log detailed response data from Apify if available
        console.error(`[LinkedInScraperClient] Apify Response Data: ${JSON.stringify(error.response.data)}`);
        console.error(`[LinkedInScraperClient] Apify Status: ${error.response.status}`);
      }
    } else {
      // Log any other unexpected errors
      console.error('[LinkedInScraperClient] An unexpected error occurred while scraping LinkedIn profiles:', error);
    }
    // Re-throw a new error to be handled by the calling function (e.g., in the controller),
    // providing a clear message about the failure.
    throw new Error(`Failed to scrape LinkedIn profiles: ${error.message || 'Unknown error'}`);
  }
}