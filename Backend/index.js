import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser"; // Added cookie-parser
import { findCandidatesAndFetchProfiles } from "./controllers/hiringControllers.js";
import jsonRagRoutes from "./routes/jsonRag.js";
import authRoutes from "./routes/authRoutes.js"; // Added auth routes

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(cookieParser()); // Use cookie-parser middleware

// Public routes (auth routes are generally public or have their own checks)
app.use("/api/auth", authRoutes);

// For now, keeping these unprotected as per original, but you can add firebaseAuthMiddleware
app.post("/api/candidates/search", findCandidatesAndFetchProfiles);
app.use("/api/rag/", jsonRagRoutes);

app.get("/", (req, res) => {
  res.send("Welcome to the Candidate Search API!");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
