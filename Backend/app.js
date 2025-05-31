import express from "express";
import jsonRagRoutes from "./routes/jsonRag.js";
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.use("/api/rag/", jsonRagRoutes);

export default app;
