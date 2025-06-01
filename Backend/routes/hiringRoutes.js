import express from "express";
import { findCandidatesAndFetchProfiles } from "../controllers/hiringControllers.js";

const router = express.Router();

// POST endpoint to find candidates and fetch profiles
router.post("/find-candidates", findCandidatesAndFetchProfiles);

export default router;
