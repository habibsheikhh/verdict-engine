import { Router } from "express";
import {
  createSubmission,
  getSubmissionById,
  getSubmissions,
} from "../controllers/submissionController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.post("/", authenticateToken, createSubmission);
router.get("/:id", getSubmissionById);
router.get("/", getSubmissions);

export default router;

