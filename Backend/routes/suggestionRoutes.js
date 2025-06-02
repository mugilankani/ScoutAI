import express from "express";
import {
  suggestPromptImprovements,
  mockSuggestPromptImprovements,
} from "../service/suggestionForUserPrompt.js";

const router = express.Router();

// Test route to verify the router is working
router.get("/test", (req, res) => {
  return res.status(200).json({ message: "Suggestion routes are working!" });
});

router.post("/improve", async (req, res) => {
  console.log("POST /improve route hit");
  console.log("Request body:", req.body);

  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    console.log("Calling suggestPromptImprovements with prompt:", prompt);

    let improvements;
    try {
      // Try to use the real service
      improvements = await suggestPromptImprovements({ userPrompt: prompt });
    } catch (serviceError) {
      console.error("Error in suggestion service:", serviceError);
      // Fall back to mock if real service fails
      console.log("Falling back to mock service");
      improvements = await mockSuggestPromptImprovements({
        userPrompt: prompt,
      });
    }

    console.log("Improvements result:", improvements);

    return res.status(200).json(improvements);
  } catch (error) {
    console.error("Error improving prompt:", error);
    return res.status(500).json({
      error: "Failed to improve prompt",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

export default router;
