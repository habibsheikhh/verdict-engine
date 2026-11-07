import { Router, Request, Response, NextFunction } from "express";
import { getSystemMetrics } from "../controllers/systemController";
import { optionalAuthenticateToken } from "../middleware/auth";

const router = Router();

const INTERNAL_SECRET =
  process.env.INTERNAL_METRICS_SECRET || "oj-internal-metrics-secret-2025";

/**
 * Access guard: Allows Admin users, callers with internal secret header,
 * or allows read access in test/development environments.
 */
const requireAdminOrInternal = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const secretHeader = req.headers["x-internal-secret"];
  if (secretHeader && secretHeader === INTERNAL_SECRET) {
    return next();
  }

  if (req.user && req.user.role === "ADMIN") {
    return next();
  }

  if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development") {
    return next();
  }

  res.status(403).json({
    error: "Forbidden: Admin privilege or internal authorization required",
  });
};

router.get("/metrics", optionalAuthenticateToken, requireAdminOrInternal, getSystemMetrics);

export default router;

