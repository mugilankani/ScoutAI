// controllers/hiringController.ts (Example)
import { Request, Response } from 'express';
import { generateMultiPayloadsFlow } from '../service/multiPayloadGenerator';
import { executeSerpSearches } from '../service/search';
import { screenCandidatesFlow } from '../service/candidateScreener';
import { fetchLinkedInProfiles } from '../service/linkedInScraper'; // Import the new client

const SERPAPI_KEY = process.env.SERPAPI_API_KEY;
const GOOGLE_AI_KEY = process.env.GOOGLE_API_KEY; // For Genkit LLM calls
const APIFY_TOKEN = process.env.APIFY_API_TOKEN; // <<< Make sure to set this environment variable!

export const findCandidatesAndFetchProfiles = async (req: Request, res: Response) => {
  const { recruiterQuery, filterPresent = false } = req.body;

  if (!recruiterQuery) {
    return res.status(400).json({ error: 'Recruiter query is required.' });
  }
  if (!SERPAPI_KEY || !GOOGLE_AI_KEY || !APIFY_TOKEN) {
    return res.status(500).json({ error: 'API keys (SERPAPI_API_KEY, GOOGLE_API_KEY, APIFY_API_TOKEN) not configured.' });
  }

  try {
    // Step 1: Generate SerpApi payloads
    const { payloads: serpPayloads } = await generateMultiPayloadsFlow.run({
      recruiterQuery: recruiterQuery,
    });

    // Step 2: Execute SerpApi searches
    const rawSerpResults = await executeSerpSearches(
      serpPayloads.serp,
      SERPAPI_KEY,
      filterPresent
    );

    // Step 3: Screen and filter candidates based on snippets
    const { filteredCandidates, summary } = await screenCandidatesFlow.run({
      recruiterQuery: recruiterQuery,
      serpResults: rawSerpResults,
    });

    // Step 4: Extract LinkedIn URLs from filtered candidates
    const linkedInUrlsToScrape = filteredCandidates
      .map(candidate => {
        // Basic regex to ensure it's a LinkedIn profile URL
        const linkedInMatch = candidate.link.match(/linkedin\.com\/in\/[^\/]+/i);
        return linkedInMatch ? linkedInMatch[0] : null;
      })
      .filter((url): url is string => url !== null); // Filter out nulls

    if (linkedInUrlsToScrape.length === 0) {
      console.warn('No valid LinkedIn profile URLs found to scrape.');
      return res.status(200).json({
        message: 'No LinkedIn profiles found for detailed scraping.',
        summary: summary,
        candidates: filteredCandidates, // Return already screened candidates
      });
    }

    // Step 5: Fetch full LinkedIn profiles using Apify
    const fullLinkedInProfiles = await fetchLinkedInProfiles(linkedInUrlsToScrape, APIFY_TOKEN);

    console.log(`Successfully fetched ${fullLinkedInProfiles.length} full LinkedIn profiles.`);

    // Now you have the detailed profile data.
    // You can further process this data, store it in your database,
    // or send it back to the client.
    res.status(200).json({
      message: 'Candidate search, screening, and profile fetching completed successfully.',
      summary: summary,
      screenedCandidates: filteredCandidates, // The candidates with relevance score/reasons
      fullProfilesData: fullLinkedInProfiles, // The detailed LinkedIn profiles
    });

  } catch (error) {
    console.error('Error in candidate processing pipeline:', error);
    res.status(500).json({ error: 'Failed to process candidate search and profile fetching.', details: error.message });
  }
};