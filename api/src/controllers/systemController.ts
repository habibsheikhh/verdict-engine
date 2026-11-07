import { Request, Response } from "express";
import { execFile } from "child_process";
import { promisify } from "util";
import { prisma } from "../lib/prisma";
import { submissionQueue } from "../queue/submissionQueue";

const execFileAsync = promisify(execFile);

export const getSystemMetrics = async (
  req: Request,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  // 1. Database Health & Volume
  let dbStatus = "connected";
  let dbLatencyMs = 0;
  let totalSubmissions = 0;
  let totalProblems = 0;
  let totalUsers = 0;
  let recentSubmissionsByVerdict: Record<string, number> = {};

  try {
    const dbStart = Date.now();
    const [subCount, probCount, userCount, verdictStats] = await Promise.all([
      prisma.submission.count(),
      prisma.problem.count(),
      prisma.user.count(),
      prisma.submission.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
    ]);
    dbLatencyMs = Date.now() - dbStart;
    totalSubmissions = subCount;
    totalProblems = probCount;
    totalUsers = userCount;
    verdictStats.forEach((v) => {
      recentSubmissionsByVerdict[v.status] = v._count.status;
    });
  } catch (err: any) {
    dbStatus = `error: ${err.message}`;
  }

  // 2. Redis & BullMQ Queue Stats
  let queueStatus = "connected";
  let queueMetrics = {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    totalJobs: 0,
  };

  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      submissionQueue.getWaitingCount(),
      submissionQueue.getActiveCount(),
      submissionQueue.getCompletedCount(),
      submissionQueue.getFailedCount(),
      submissionQueue.getDelayedCount(),
    ]);

    queueMetrics = {
      waiting,
      active,
      completed,
      failed,
      delayed,
      totalJobs: waiting + active + completed + failed + delayed,
    };
  } catch (err: any) {
    queueStatus = `error: ${err.message}`;
  }

  // 3. Sandbox Container Health & Active Runners
  let dockerDaemonStatus = "disconnected";
  let activeJudgeRunners = 0;
  let runnerContainerNames: string[] = [];

  try {
    const { stdout } = await execFileAsync(
      "docker",
      ["ps", "--filter", "name=oj-", "--format", "{{.Names}}"],
      { timeout: 4000 }
    );
    dockerDaemonStatus = "connected";
    runnerContainerNames = stdout.trim().split("\n").filter(Boolean);
    activeJudgeRunners = runnerContainerNames.length;
  } catch (err: any) {
    dockerDaemonStatus = `error: ${err.message}`;
  }

  const mem = process.memoryUsage();
  const overallHealthy =
    dbStatus === "connected" &&
    queueStatus === "connected" &&
    dockerDaemonStatus === "connected";

  res.status(overallHealthy ? 200 : 503).json({
    status: overallHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    metricsResponseTimeMs: Date.now() - startTime,
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      totalSubmissions,
      totalProblems,
      totalUsers,
      submissionsByVerdict: recentSubmissionsByVerdict,
    },
    queue: {
      status: queueStatus,
      name: submissionQueue.name,
      ...queueMetrics,
    },
    sandbox: {
      dockerDaemon: dockerDaemonStatus,
      activeJudgeRunners,
      containers: runnerContainerNames,
    },
    system: {
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      },
    },
  });
};

