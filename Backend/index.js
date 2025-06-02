// server.js

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { firestore } from "./config/firebaseAdmin.js";
import { findCandidatesAndFetchProfiles } from "./controllers/hiringControllers.js";

// Get the directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Debug: Log the paths being used
console.log("Backend directory:", __dirname);
console.log("Static files path:", path.join(__dirname, "dist"));
console.log("Index.html path:", path.join(__dirname, "dist", "index.html"));

// Import routes
import candidateRoutes from "./routes/candidateRoutes.js";
import jsonRagRoutes from "./routes/jsonRag.js";
import authRoutes from "./routes/authRoutes.js";
import suggestionRoutes from "./routes/suggestionRoutes.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: [
      "https://scoutai-v1.onrender.com",
      process.env.CLIENT_URL || "http://localhost:5173",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.use(express.json());
app.use(cookieParser());

// Diagnostic middleware to log all requests
app.use((req, res, next) => {
  console.log(`SERVER LOG: ${req.method} ${req.url}`);
  if (req.method === "POST" && req.body) {
    console.log(`SERVER LOG: Request Body:`, req.body);
  }
  next();
});

// --- Candidate Search Routes ---
app.post("/api/candidates/search", async (req, res) => {
  console.log("SERVER LOG: /api/candidates/search POST endpoint hit");
  const {
    recruiterQuery,
    filterPresent = false,
    userId: clientUserId,
  } = req.body;
  const serverUserId = req.user?.uid;

  const effectiveUserId = serverUserId || clientUserId || "anonymous";

  if (!recruiterQuery) {
    console.log("SERVER LOG: Recruiter query missing");
    return res.status(400).json({ error: "Recruiter query is required." });
  }

  const searchId = uuidv4(); // Using uuid for truly unique IDs
  const now = new Date().toISOString();
  console.log(
    `SERVER LOG: Generated searchId: ${searchId} for query: "${recruiterQuery}"`
  );

  try {
    const initialSearchData = {
      userId: effectiveUserId,
      query: recruiterQuery,
      filterPresent,
      searchId: searchId,
      status: "pending",
      progress: 0,
      statusMessage: "Search initiated.",
      createdAt: now,
      updatedAt: now,
    };
    await firestore.collection("searches").doc(searchId).set(initialSearchData);
    console.log(
      `SERVER LOG: Stored initial search data for ${searchId} in Firestore.`
    );

    res.status(202).json({
      message: "Search initiated. Check status for results.",
      searchId: searchId,
      status: "pending",
      initialData: initialSearchData,
    });
    console.log(`SERVER LOG: Sent 202 response for searchId ${searchId}`);

    // --- Start the long-running task asynchronously ---
    findCandidatesAndFetchProfiles(
      recruiterQuery,
      filterPresent,
      searchId,
      effectiveUserId
    )
      .then(async (finalData) => {
        console.log(
          `SERVER LOG: Background search ${searchId} completed successfully.`
        );
        await firestore.collection("searches").doc(searchId).update({
          status: "completed",
          progress: 100,
          statusMessage: "Search completed successfully.",
          results: finalData,
          updatedAt: new Date().toISOString(),
        });
      })
      .catch(async (error) => {
        console.error(
          `SERVER LOG: Error in background search task ${searchId}:`,
          error.message
        );
        await firestore
          .collection("searches")
          .doc(searchId)
          .update({
            status: "failed",
            progress: 0,
            statusMessage: `Search failed: ${
              error.message || "An unknown error occurred."
            }`,
            error: error.message || "An unknown error occurred during search.",
            updatedAt: new Date().toISOString(),
          });
      });
  } catch (error) {
    console.error(
      "SERVER LOG: Error initiating search in POST /api/candidates/search:",
      error.message
    );
    res
      .status(500)
      .json({ error: "Failed to initiate search.", details: error.message });
  }
});

app.get("/api/candidates/search/status/:searchId", async (req, res) => {
  const { searchId } = req.params;
  // ... (rest of the status endpoint remains the same) ...
  console.log(
    `SERVER LOG: /api/candidates/search/status/${searchId} GET endpoint hit`
  );
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
    console.log(
      `SERVER LOG: Returning status for ${searchId}:`,
      searchData.status
    );
    res.status(200).json(searchData);
  } catch (error) {
    console.error(
      `SERVER LOG: Error fetching status for search ${searchId}:`,
      error.message
    );
    res.status(500).json({
      error: "Failed to fetch search status.",
      details: error.message,
    });
  }
});

// Routes
app.use("/api/candidates", candidateRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/suggestions", suggestionRoutes);
app.use("/api/rag", jsonRagRoutes);

// Test routes
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working!" });
});

// Manual route for testing suggestions
app.post("/api/test-suggest", async (req, res) => {
  try {
    const { mockSuggestPromptImprovements } = await import(
      "./service/suggestionForUserPrompt.js"
    );
    const result = await mockSuggestPromptImprovements({
      userPrompt: req.body.prompt || "Find developers",
    });
    res.json(result);
  } catch (err) {
    console.error("Test suggest error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Serve static files from the backend's dist folder
app.use(express.static(path.join(__dirname, "dist")));

// Handle React routing - catch all non-API routes
app.get(/^(?!\/api).*/, (req, res) => {
  const indexPath = path.join(__dirname, "dist", "index.html");
  console.log(`Serving index.html from: ${indexPath} for route: ${req.path}`);

  // Check if index.html exists before trying to serve it
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.error(`index.html not found at: ${indexPath}`);
    res
      .status(404)
      .send(
        "Frontend application not found. Please ensure the dist folder contains the built frontend files."
      );
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`- Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(
    `- Suggestions endpoint: http://localhost:${PORT}/api/suggestions/improve`
  );
  console.log(
    `- Candidates search endpoint: http://localhost:${PORT}/api/candidates/search`
  );
});

// Handle uncaught errors
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});
