import express from "express";

const app = express();
const port = process.env.PORT || 3000;

// Basic route
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
