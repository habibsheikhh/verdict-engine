import { Router } from "express";
import {
  createProblem,
  getProblems,
  getProblemBySlug,
  updateProblem,
  deleteProblem,
} from "../controllers/problemController";
import {
  authenticateToken,
  optionalAuthenticateToken,
  requireAdmin,
} from "../middleware/auth";

const router = Router();

// Public routes
router.get("/", getProblems);
router.get("/:slug", optionalAuthenticateToken, getProblemBySlug);

// Admin-protected routes
router.post("/", authenticateToken, requireAdmin, createProblem);
router.put("/:id", authenticateToken, requireAdmin, updateProblem);
router.delete("/:id", authenticateToken, requireAdmin, deleteProblem);

export default router;

