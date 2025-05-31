
// controllers/jsonRagController.js
import { indexJsonFlow, retrieveAndGenerateJsonAnswer } from "../service/genkitService.js";

export const indexJsonController = async (req, res) => {
  try {
    const candidate  = req.body;

    if (!candidate) {
      return res.status(400).json({
        success: false,
        message: "No JSON data provided"
      });
    }

    // Validate that candidate is valid JSON
    try {
      if (typeof candidate === 'string') {
        JSON.parse(candidate);
      }
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: "Invalid JSON format",
        error: parseError.message
      });
    }

    const result = await indexJsonFlow({
      jsonData: typeof candidate === 'string' ? JSON.parse(candidate) : candidate,
      documentName: `json_doc_${Date.now()}`
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("JSON indexing error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process JSON data",
      error: error.message,
    });
  }
};

export const askJsonController = async (req, res) => {
  try {
    const { input } = req.body;

    if (!input || typeof input !== 'string' || input.trim() === '') {
      return res.status(400).json({
        input: "",
        output: "",
        status: "error",
        error: "Invalid or missing input string.",
      });
    }

    console.log("Processing JSON query:", input);
    
    const result = await retrieveAndGenerateJsonAnswer({ input: input.trim() });
    
    return res.status(200).json(result);
  } catch (error) {
    console.error("JSON query error:", error);
    return res.status(500).json({
      input: req.body.input || "",
      output: "",
      status: "error",
      error: "Internal server error",
    });
  }
};