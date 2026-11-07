import { startSubmissionWorker } from "./worker";

console.log("[Worker Service] Starting Online Judge Sandbox Worker...");
const worker = startSubmissionWorker();

process.on("SIGINT", async () => {
  console.log("\n[Worker Service] Shutting down gracefully...");
  await worker.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n[Worker Service] Terminating gracefully...");
  await worker.close();
  process.exit(0);
});

