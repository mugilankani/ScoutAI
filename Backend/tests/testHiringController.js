import { findCandidatesAndFetchProfiles } from "../controllers/hiringControllers.js";

// Mock Express request and response objects
async function testFindCandidatesAndFetchProfiles() {
  // Mock request object with body
  const req = {
    body: {
      recruiterQuery:
        "Senior AI/ML Engineer with expertise in Large Language Models (LLMs), TensorFlow, PyTorch, and deploying models on GCP, based in New York, open to remote work.",
      filterPresent: true,
    },
  };

  // Mock response object with status and json methods
  const res = {
    status: function (statusCode) {
      console.log(`Status code: ${statusCode}`);
      return this;
    },
    json: function (data) {
      console.log("Response data:");
      console.log(JSON.stringify(data, null, 2));
      return this;
    },
  };

  try {
    // Call the controller function with mocked req and res
    console.log("Starting function execution...");
    await findCandidatesAndFetchProfiles(req, res);
    console.log("Function execution completed successfully");
  } catch (error) {
    console.error("Error executing function:", error);
  }
}

// Run the test function
testFindCandidatesAndFetchProfiles()
  .then(() => console.log("Test completed"))
  .catch((err) => console.error("Test failed with error:", err));
