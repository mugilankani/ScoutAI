// controllers/jsonRagController.js
import {
  indexJsonFlow,
  retrieveAndGenerateJsonAnswer,
} from "../service/genkitService.js";
import { generateFingerprint } from "../utils/candidateUtils.js";
import { firestore } from "../config/firebaseAdmin.js";

export const indexJsonController = async (req, res) => {
  try {
    const candidate = req.body;

    if (!candidate) {
      return res.status(400).json({
        success: false,
        message: "No JSON data provided",
      });
    }

    // Validate that candidate is valid JSON
    try {
      if (typeof candidate === "string") {
        JSON.parse(candidate);
      }
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: "Invalid JSON format",
        error: parseError.message,
      });
    }

    const candidateObj =
      typeof candidate === "string" ? JSON.parse(candidate) : candidate;

    let fingerprint;
    try {
      fingerprint = generateFingerprint(candidateObj);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot generate fingerprint: missing github, linkedin, and email.",
      });
    }

    // Prepare top-level fields for easier future queries
    const email = candidateObj?.email || "";
    candidateObj.fingerprint = fingerprint;
    candidateObj.email = email;
    candidateObj.linkedin = candidateObj?.profiles?.linkedin || "";
    candidateObj.github = candidateObj?.profiles?.github || "";

    // 1. Check for fingerprint match
    let snapshot = await firestore
      .collection("json_documents")
      .where("fingerprint", "==", fingerprint)
      .limit(1)
      .get();

    let documentName, operationType;

    if (!snapshot.empty) {
      documentName = snapshot.docs[0].id;
      operationType = "update (fingerprint match)";
    } else {
      // 2. No fingerprint match, check for email match only
      let found = false;
      let matchId = null;
      if (email) {
        const emailSnap = await firestore
          .collection("json_documents")
          .where("email", "==", email)
          .limit(1)
          .get();
        if (!emailSnap.empty) {
          found = true;
          matchId = emailSnap.docs[0].id;
        }
      }
      if (found) {
        documentName = matchId;
        operationType = "update (matched on email)";
      } else {
        documentName = `json_doc_${Date.now()}`;
        operationType = "create";
      }
    }

    const result = await indexJsonFlow({
      jsonData: candidateObj,
      documentName,
    });

    res.status(200).json({
      success: true,
      message: `Candidate ${operationType} successfully`,
      docId: result.docId || documentName,
      operation: operationType,
      candidate: candidateObj, // include the candidate data in the response
    });
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

    if (!input || typeof input !== "string" || input.trim() === "") {
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
