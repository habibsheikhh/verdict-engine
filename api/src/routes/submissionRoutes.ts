import { Router } from "express";
import {
  createSubmission,
  getSubmissionById,
  getSubmissions,
} from "../controllers/submissionController";
import { authenticateToken } from "../middleware/auth";
import { submissionRateLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post("/", authenticateToken, submissionRateLimiter, createSubmission);
router.get("/:id", getSubmissionById);
router.get("/", getSubmissions);

export default router;

