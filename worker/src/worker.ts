import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import dotenv from "dotenv";
import { prisma } from "./lib/prisma";
import { DockerSandboxExecutor } from "./sandbox/executor";
import { SandboxConfig } from "./sandbox/types";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
export const SUBMISSION_QUEUE_NAME = "submission-queue";

export interface SubmissionJobData {
  submissionId: string;
}

export const createRedisConnection = () => {
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
  });
};

export const startSubmissionWorker = () => {
  const connection = createRedisConnection();
  const executor = new DockerSandboxExecutor();

  const worker = new Worker<SubmissionJobData>(
    SUBMISSION_QUEUE_NAME,
    async (job: Job<SubmissionJobData>) => {
      const { submissionId } = job.data;
      console.log(`[Worker] Picked up job for submission: ${submissionId}`);

      try {
        // 1. Fetch submission with problem and ALL test cases from DB
        const submission = await prisma.submission.findUnique({
          where: { id: submissionId },
          include: {
            problem: {
              include: {
                testCases: {
                  orderBy: { createdAt: "asc" },
                },
              },
            },
          },
        });

        if (!submission) {
          console.error(`[Worker] Submission ${submissionId} not found in DB`);
          return;
        }

        // 2. Mark submission as PROCESSING
        await prisma.submission.update({
          where: { id: submissionId },
          data: { status: "PROCESSING" },
        });

        const testCases = submission.problem.testCases.map((tc) => ({
          id: tc.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden,
        }));

        const sandboxConfig: SandboxConfig = {
          timeLimitMs: submission.problem.timeLimit,
          memoryLimitMb: submission.problem.memoryLimit,
          cpus: "1.0",
          pidsLimit: 64,
        };

        // 3. Execute in ephemeral isolated Docker container
        const result = await executor.runSubmission(
          submission.code,
          testCases,
          sandboxConfig,
          submission.id
        );

        // 4. Update submission in PostgreSQL with verdict & performance metrics
        await prisma.submission.update({
          where: { id: submissionId },
          data: {
            status: result.verdict as any,
            executionTime: result.executionTimeMs,
            failedTestCase: result.failedTestCaseIndex,
            errorMessage: result.errorMessage,
            stdout: result.stdout,
          },
        });

        console.log(
          `[Worker] Finished submission ${submissionId}: ${result.verdict} in ${result.executionTimeMs}ms`
        );
      } catch (err: any) {
        console.error(
          `[Worker] Error processing submission ${submissionId}:`,
          err
        );

        await prisma.submission.update({
          where: { id: submissionId },
          data: {
            status: "INTERNAL_ERROR",
            errorMessage: err.message || "Internal evaluation error",
          },
        });
        throw err;
      }
    },
    {
      connection,
      concurrency: 2, // Process up to 2 concurrent container executions
    }
  );

  worker.on("ready", () => {
    console.log(`[Worker] Connected to Redis and listening on '${SUBMISSION_QUEUE_NAME}'`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  const close = async () => {
    try {
      await worker.close();
    } catch {}
    try {
      await connection.quit();
    } catch {}
    try {
      await prisma.$disconnect();
    } catch {}
  };

  return {
    worker,
    connection,
    executor,
    close,
  };
};

