import express from 'express';
import dotenv from 'dotenv';
import { findCandidatesAndFetchProfiles } from './controllers/hiringControllers.js'; // Ensure correct path and .js extension

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000; // Use port from .env or default to 3000

// Middleware to parse JSON request bodies
app.use(express.json());

// Define the API endpoint for finding and fetching candidates
// This is a POST request because we're sending a 'recruiterQuery' in the body
app.post('/api/candidates/search', findCandidatesAndFetchProfiles);

// Basic health check or root route
app.get('/', (req, res) => {
  res.send('Welcome to the Candidate Search API!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Endpoints available:');
  console.log(`  POST /api/candidates/search`);
  console.log(`  GET /`);
});