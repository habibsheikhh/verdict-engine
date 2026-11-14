import path from "path";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import problemRoutes from "./routes/problemRoutes";
import submissionRoutes from "./routes/submissionRoutes";
import systemRoutes from "./routes/systemRoutes";
import { prisma } from "./lib/prisma";
import { submissionQueue, redisConnection } from "./queue/submissionQueue";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/system", systemRoutes);

// 404 Route handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({ error: "Internal server error", message: err.message });
});

let server: any = null;

export const closeApiGracefully = async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  try {
    await submissionQueue.close();
  } catch {}
  try {
    await redisConnection.quit();
  } catch {}
  try {
    await prisma.$disconnect();
  } catch {}
};

if (process.env.NODE_ENV !== "test") {
  server = app.listen(PORT, () => {
    console.log(`[API Server] Running on http://localhost:${PORT}`);
  });
}

process.on("SIGINT", async () => {
  console.log("\n[API Server] SIGINT received. Shutting down gracefully...");
  await closeApiGracefully();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n[API Server] SIGTERM received. Terminating gracefully...");
  await closeApiGracefully();
  process.exit(0);
});

export default app;
// Test Commit