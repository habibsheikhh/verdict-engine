import { Request, Response } from "express";
import rateLimit from "express-rate-limit";

const WINDOW_MS = 30 * 1000; // 30 seconds window
const DEFAULT_MAX_SUBMISSIONS = 5; // 5 submissions per 30 seconds

export const submissionRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: () => {
    if (process.env.SUBMISSION_RATE_LIMIT_MAX) {
      return parseInt(process.env.SUBMISSION_RATE_LIMIT_MAX, 10);
    }
    return DEFAULT_MAX_SUBMISSIONS;
  },
  keyGenerator: (req: Request) => {
    // Key primarily on authenticated user ID; fall back to client IP
    if (req.user?.userId) {
      return `user_${req.user.userId}`;
    }
    return req.ip || req.socket.remoteAddress || "127.0.0.1";
  },
  validate: {
    ip: false,
    keyGeneratorIpFallback: false,
  },
  standardHeaders: true, // Return `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (_req: Request, res: Response, _next, options) => {
    const retryAfterSec = Math.ceil(options.windowMs / 1000);
    res.setHeader("Retry-After", retryAfterSec);
    res.status(429).json({
      error: "Too Many Requests",
      message: `Submission rate limit exceeded. You may only submit ${DEFAULT_MAX_SUBMISSIONS} times per 30 seconds.`,
      retryAfterSeconds: retryAfterSec,
    });
  },
});
