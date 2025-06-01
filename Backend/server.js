import express from "express";
import dotenv from "dotenv";
import hiringRoutes from "./routes/hiringRoutes.js";

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON
app.use(express.json());

// Use hiring routes
app.use("/api/hiring", hiringRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
