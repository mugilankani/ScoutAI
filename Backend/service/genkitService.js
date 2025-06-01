// File: services/genkitService.js
import { genkit } from "genkit";
import {
  googleAI,
  gemini25FlashPreview0417,
  textEmbedding004,
} from "@genkit-ai/googleai";
import { promisify } from "util";
import { exec } from "child_process";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { defineFirestoreRetriever } from "@genkit-ai/firebase";
const execAsync = promisify(exec);
import { firestore } from "../config/firebaseAdmin.js";
import dotenv from "dotenv";
import crypto from "crypto";
dotenv.config();
// GENKIT SETUP
const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  model: gemini25FlashPreview0417,
});

export const indexJsonFlow = ai.defineFlow(
  {
    name: "indexJsonFlow",
    description: "Processes JSON data, embeds, and stores it in Firestore",
    InputSchema: z.object({
      jsonData: z.any().describe("JSON data to be indexed"),
      documentName: z
        .string()
        .optional()
        .describe("Optional document name for metadata"),
    }),
    OutputSchema: z.object({
      success: z.boolean().describe("Whether the indexing was successful"),
      message: z.string().describe("Status message"),
      docId: z.string().optional().describe("ID of the created document"),
      error: z.string().optional().describe("Error message if any"),
    }),
  },
  async (input) => {
    try {
      // Convert JSON to string for embedding
      const jsonString = JSON.stringify(input.jsonData, null, 2);

      console.log(`Processing JSON data with ${jsonString.length} characters`);

      const docId = await embedAndStoreJson(
        jsonString,
        input.jsonData,
        input.documentName || `json_doc_${Date.now()}`
      );

      return {
        success: true,
        message: `Successfully indexed JSON data`,
        docId,
      };
    } catch (error) {
      console.error("JSON Flow error:", error);
      return {
        success: false,
        message: "Failed to process JSON data",
        error: error.message,
      };
    }
  }
);

// Fingerprint generation logic (same as in candidateUtils.js)
function generateFingerprint(candidate) {
  // Priority: email > linkedin > github
  const email = candidate?.contactInfo?.email || candidate?.email || "";
  const linkedin =
    candidate?.socialInfo?.linkedinUrl || candidate?.profiles?.linkedin || "";
  const github = candidate?.profiles?.github || "";

  let base = "";
  if (linkedin) {
    base = linkedin;
  } else if (github) {
    base = github;
  } else if (email) {
    base = email;
  } else {
    // fallback: hash the JSON string itself
    base = JSON.stringify(candidate);
  }

  return crypto.createHash("sha256").update(base).digest("hex");
}

// Helper function to clean undefined values from object
function cleanUndefinedValues(obj) {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefinedValues).filter((item) => item !== undefined);
  }
  if (typeof obj === "object") {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        const cleanedValue = cleanUndefinedValues(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
    }
    return cleaned;
  }
  return obj;
}

// JSON embedding and storing function
async function embedAndStoreJson(jsonString, originalJson, documentName) {
  try {
    console.log("Generating embedding for JSON data...");

    // Generate fingerprint if not present
    let fingerprint = originalJson.fingerprint;
    if (!fingerprint) {
      fingerprint = generateFingerprint(originalJson);
    }

    // Clean the original JSON to remove undefined values
    const cleanedJson = cleanUndefinedValues(originalJson);
    cleanedJson.fingerprint = fingerprint;

    // Generate embedding for the JSON string
    const embeddingResult = await ai.embed({
      embedder: textEmbedding004,
      content: jsonString,
    });

    const embedding = embeddingResult[0].embedding;

    const docRef = firestore.collection("json_documents").doc(documentName);

    // Fetch existing doc to preserve createdAt if present
    let createdAt = FieldValue.serverTimestamp();
    const existingDoc = await docRef.get();
    if (existingDoc.exists && existingDoc.data()?.metadata?.createdAt) {
      createdAt = existingDoc.data().metadata.createdAt;
    }

    await docRef.set(
      {
        embedding: FieldValue.vector(embedding),
        content: jsonString,
        originalData: cleanedJson,
        fingerprint: fingerprint,
        metadata: {
          documentName,
          timestamp: FieldValue.serverTimestamp(),
          charCount: jsonString.length,
          source: "json",
          type: "json_document",
          createdAt: createdAt,
          updatedAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );

    console.log(
      `✅ JSON document stored/updated in Firestore with ID: ${docRef.id}`
    );
    return docRef.id;
  } catch (error) {
    console.error("Failed to embed or store JSON:", error);
    throw error;
  }
}

// JSON Retriever
const jsonRetriever = defineFirestoreRetriever(ai, {
  name: "jsonRetriever",
  firestore,
  collection: "json_documents",
  contentField: "content",
  vectorField: "embedding",
  embedder: textEmbedding004,
  distanceMeasure: "COSINE",
});

// JSON Retrieve and Generate Flow
export const retrieveAndGenerateJsonAnswer = ai.defineTool(
  {
    name: "retrieveAndGenerateJsonAnswer",
    description:
      "Retrieves relevant JSON documents and generates an answer for a user question",
    InputSchema: z.object({
      input: z.string().describe("User question"),
    }),
    OutputSchema: z.object({
      input: z.string().describe("Original user question"),
      output: z.string().describe("Generated answer"),
      status: z.string().describe("Processing status"),
      error: z.string().optional().describe("Error message if any"),
      retrievedDocs: z
        .array(z.any())
        .optional()
        .describe("Retrieved documents for reference"),
    }),
  },
  async (input) => {
    try {
      const userQuestion = input.input;

      // Retrieve top 10 similar documents
      const docs = await ai.retrieve({
        retriever: jsonRetriever,
        query: userQuestion,
        options: { limit: 10 },
      });

      if (!docs || docs.length === 0) {
        return {
          input: userQuestion,
          output: "No relevant JSON documents found for your query.",
          status: "success",
          retrievedDocs: [],
        };
      }

      // Process retrieved documents
      const processedDocs = docs
        .map((doc, index) => {
          let content = "";
          if (
            doc.content &&
            Array.isArray(doc.content) &&
            doc.content.length > 0
          ) {
            content = doc.content[0].text || "";
          }

          return {
            index: index + 1,
            content: content,
            metadata: doc.metadata || {},
          };
        })
        .filter((doc) => doc.content.trim() !== "");

      if (processedDocs.length === 0) {
        return {
          input: userQuestion,
          output: "Found documents but could not extract meaningful content.",
          status: "error",
          error: "No valid content found in retrieved documents",
        };
      }

      return {
        status: "success",
        retrievedDocs: processedDocs.map((doc) => ({
          content: doc.content.substring(0, 200) + "...", // Truncate for response size
          metadata: doc.metadata,
        })),
      };
    } catch (error) {
      console.error("Error in retrieveAndGenerateJsonAnswer:", error);
      return {
        input: input.input,
        output: "",
        status: "error",
        error: "An error occurred while processing your request.",
      };
    }
  }
);
