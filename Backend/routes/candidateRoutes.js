import express from 'express';
import { handleCandidatesSearch, getUserSearchHistory } from '../controllers/hiringControllers.js';
import { firestore } from '../config/firebaseAdmin.js'; // Import Firestore

const router = express.Router();

// Existing routes
router.post('/search', handleCandidatesSearch);

// Status endpoint
router.get('/search/status/:searchId', async (req, res) => {
  const { searchId } = req.params;
  console.log(`SERVER LOG: /candidates/search/status/${searchId} GET endpoint hit`);
  
  if (!searchId) {
    return res.status(400).json({ error: "Search ID is required." });
  }
  
  try {
    const searchDocRef = firestore.collection("searches").doc(searchId);
    const searchDoc = await searchDocRef.get();
    
    if (!searchDoc.exists) {
      console.log(`SERVER LOG: Search ${searchId} not found in Firestore.`);
      return res.status(404).json({ error: "Search not found." });
    }
    
    const searchData = searchDoc.data();
    console.log(`SERVER LOG: Returning status for ${searchId}:`, searchData.status);
    res.status(200).json(searchData);
  } catch (error) {
    console.error(`SERVER LOG: Error fetching status for search ${searchId}:`, error.message);
    res.status(500).json({
      error: "Failed to fetch search status.",
      details: error.message,
    });
  }
});

// New route for getting user's search history
router.get('/search/history/:userId', getUserSearchHistory);

export default router;
