// service/linkedin-scraper-client.ts

import axios from 'axios';

// --- Start: Detailed ApifyLinkedInProfile Interface ---
export interface ApifyLinkedInProfile {
  linkedinUrl: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  headline?: string;
  connections?: number;
  followers?: number;
  email?: string | null;
  mobileNumber?: string | null;
  jobTitle?: string;
  companyName?: string;
  companyIndustry?: string;
  companyWebsite?: string;
  companyLinkedin?: string;
  companyFoundedIn?: number;
  companySize?: string;
  currentJobDuration?: string;
  currentJobDurationInYrs?: number;
  topSkillsByEndorsements?: string | null; // This could be a string or array depending on exact output
  addressCountryOnly?: string;
  addressWithCountry?: string;
  addressWithoutCountry?: string;
  profilePic?: string | null;
  profilePicHighQuality?: string | null;
  about?: string | null;
  publicIdentifier?: string;
  openConnection?: any | null; // Type can be refined if structure is known
  urn?: string;
  creatorWebsite?: { name?: string; link?: string } | null;
  
  experiences?: Array<{
    companyId?: string;
    companyUrn?: string;
    companyLink1?: string;
    logo?: string;
    title?: string;
    subtitle?: string;
    caption?: string;
    metadata?: string;
    breakdown?: boolean;
    subComponents?: Array<{
      description?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  }>;

  updates?: Array<{
    postText?: string;
    image?: string;
    postLink?: string;
    numLikes?: number;
    numComments?: number;
    reactionTypeCounts?: Array<{
      count?: number;
      reactionType?: string;
    }>;
  }>;

  skills?: Array<{
    title?: string;
    subComponents?: Array<{
      description?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  }>;

  profilePicAllDimensions?: Array<{
    width?: number;
    height?: number;
    url?: string;
  }>;

  educations?: Array<{
    companyId?: string;
    companyUrn?: string;
    companyLink1?: string;
    logo?: string;
    title?: string;
    caption?: string;
    breakdown?: boolean;
    subComponents?: Array<{
      description?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  }>;

  licenseAndCertificates?: any[]; // Refine as needed
  honorsAndAwards?: any[]; // Refine as needed
  languages?: string[]; // Assuming simple array of language names
  volunteerAndAwards?: any[]; // Refine as needed
  verifications?: any[]; // Refine as needed
  promos?: any[]; // Refine as needed
  highlights?: any[]; // Refine as needed
  projects?: any[]; // Refine as needed
  publications?: any[]; // Refine as needed
  patents?: any[]; // Refine as needed
  courses?: any[]; // Refine as needed
  testScores?: any[]; // Refine as needed
  organizations?: any[]; // Refine as needed
  volunteerCauses?: any[]; // Refine as needed
  interests?: Array<{
    section_name?: string;
    section_components?: Array<{
      titleV2?: string;
      caption?: string;
      size?: string;
      textActionTarget?: string;
      subComponents?: any[];
    }>;
  }>;
  recommendations?: any[]; // Refine as needed
}
// --- End: Detailed ApifyLinkedInProfile Interface ---


/**
 * Fetches full LinkedIn profiles using the Apify LinkedIn Profile Scraper.
 *
 * @param profileUrls An array of LinkedIn profile URLs to scrape.
 * @param apifyToken Your Apify API token.
 * @returns A Promise that resolves to an array of ApifyLinkedInProfile objects.
 */
export async function fetchLinkedInProfiles(
  profileUrls: string[],
  apifyToken: string
): Promise<ApifyLinkedInProfile[]> {
  if (!profileUrls || profileUrls.length === 0) {
    console.warn('[LinkedInScraperClient] No profile URLs provided to scrape.');
    return [];
  }

  const apifyEndpoint = 'https://api.apify.com/v2/acts/dev_fusion~linkedin-profile-scraper/run-sync-get-dataset-items';

  console.log(`[LinkedInScraperClient] Initiating Apify scraper for ${profileUrls.length} profiles.`);

  try {
    const response = await axios.post(apifyEndpoint, {
      profileUrls: profileUrls,
      // You can add other Apify scraper input parameters here if needed
    }, {
      params: {
        token: apifyToken,
        // The 'run-sync-get-dataset-items' implies it waits, but
        // you might want to explicitly set a wait time for very long jobs
        // waitSecs: 300, // Example: wait up to 5 minutes
      },
      headers: {
        'Content-Type': 'application/json',
      },
      // Set a generous timeout for the API call as scraping can take time
      timeout: 600 * 1000, // 10 minutes timeout
    });

    if (response.data && Array.isArray(response.data)) {
      console.log(`[LinkedInScraperClient] Successfully fetched ${response.data.length} profiles from Apify.`);
      return response.data as ApifyLinkedInProfile[];
    } else {
      console.warn('[LinkedInScraperClient] Apify response did not contain an array of profile data or was empty:', response.data);
      return [];
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`[LinkedInScraperClient] Error fetching LinkedIn profiles from Apify: ${error.message}`);
      if (error.response) {
        console.error(`[LinkedInScraperClient] Apify Response Data: ${JSON.stringify(error.response.data)}`);
        console.error(`[LinkedInScraperClient] Apify Status: ${error.response.status}`);
        // Consider logging specific status codes or error messages from Apify's side
      }
    } else {
      console.error('[LinkedInScraperClient] An unexpected error occurred while scraping LinkedIn profiles:', error);
    }
    // Re-throw the error to be handled by the calling function (e.g., in the controller)
    throw new Error(`Failed to scrape LinkedIn profiles: ${error.message || 'Unknown error'}`);
  }
}