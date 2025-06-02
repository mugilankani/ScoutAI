import express from "express";
import { findCandidatesAndFetchProfiles } from "../controllers/hiringControllers.js";
import { v4 as uuidv4 } from "uuid"; // npm install uuid
import { firestore } from "../firebase.js"; // Assuming you have this initialized

const router = express.Router();

// POST endpoint to find candidates and fetch profiles
router.post("/api/candidates/search", async (req, res) => {
  const { recruiterQuery, filterPresent = false } = req.body;
  const userId = req.user?.uid; // Assuming you have user auth and can get a userId

  if (!recruiterQuery) {
    return res.status(400).json({ error: "Recruiter query is required." });
  }

  const searchId = uuidv4();

  try {
    // Store initial task information in Firestore
    await firestore
      .collection("searches")
      .doc(searchId)
      .set({
        userId: userId || "anonymous", // Store user ID if available
        query: recruiterQuery,
        filterPresent,
        status: "pending",
        createdAt: new Date().toISOString(),
        results: []
      });

    // Respond immediately with 202 Accepted
    res.status(202).json({
      message: "Search initiated. Check status for results.",
      searchId: searchId,
      status: "pending",
    });

    // --- Start the long-running task asynchronously ---
    // IMPORTANT: Do NOT await this promise here in the request handler
    // This allows the 202 response to be sent immediately.
    findCandidatesAndFetchProfiles(
      recruiterQuery,
      filterPresent,
      searchId,
      userId
    )
      .then(async (finalData) => {
        // Modify findCandidatesAndFetchProfiles to return data
        console.log(`Search ${searchId} completed successfully.`);
        await firestore.collection("searches").doc(searchId).update({
          status: "completed",
          results: finalData, // The structure you want (e.g., { summary, screenedCandidates, finalResult })
          updatedAt: new Date().toISOString(),
        });
      })
      .catch(async (error) => {
        console.error(`Error in background search task ${searchId}:`, error);
        await firestore
          .collection("searches")
          .doc(searchId)
          .update({
            status: "failed",
            error: error.message || "An unknown error occurred during search.",
            updatedAt: new Date().toISOString(),
          });
      });
  } catch (error) {
    console.error("Error initiating search:", error);
    // This catch is for errors during the initial setup (e.g., Firestore write for 'pending')
    res.status(500).json({ error: "Failed to initiate search." });
  }
});

export default router;
