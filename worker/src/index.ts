import { startSubmissionWorker } from "./worker";
import { DockerSandboxExecutor } from "./sandbox/executor";

console.log("[Worker Service] Starting Online Judge Sandbox Worker Engine...");

// Initial sweep of any zombie containers left by abruptly stopped previous runs
DockerSandboxExecutor.cleanupAllJudgeContainers().catch(() => {});
DockerSandboxExecutor.sweepTempDirectories().catch(() => {});

// Background periodic sweeper running every 30 seconds
const sweeperInterval = DockerSandboxExecutor.startPeriodicSweeper(30000);

const runner = startSubmissionWorker();

let isShuttingDown = false;
const shutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[Worker Service] ${signal} received. Shutting down gracefully...`);
  clearInterval(sweeperInterval);
  try {
    await runner.close();
    await DockerSandboxExecutor.cleanupAllJudgeContainers();
    console.log("[Worker Service] Graceful shutdown complete.");
    process.exit(0);
  } catch (err) {
    console.error("[Worker Service] Error during shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
