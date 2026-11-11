import { Queue } from "bullmq";
import Redis from "ioredis";
import dotenv from "dotenv";
import path from "path";

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const SUBMISSION_QUEUE_NAME = "submission-queue";

export interface SubmissionJobData {
  submissionId: string;
}

export const submissionQueue = new Queue<SubmissionJobData>(
  SUBMISSION_QUEUE_NAME,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: 1000,
      removeOnFail: 1000,
    },
  }
);

