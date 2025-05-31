import express from "express";
import { indexJsonController, askJsonController } from "../controllers/jsonRagController.js";

const router = express.Router();

router.post("/index-json", indexJsonController);
router.post("/ask-json", askJsonController);

export default router;
