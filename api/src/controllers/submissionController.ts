import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { createSubmissionSchema } from "../validators";
import { submissionQueue } from "../queue/submissionQueue";

export const createSubmission = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const parseResult = createSubmissionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parseResult.error.format(),
      });
      return;
    }

    const { problemId, code, language } = parseResult.data;

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
    });

    if (!problem) {
      res.status(404).json({ error: "Problem not found" });
      return;
    }

    const submission = await prisma.submission.create({
      data: {
        userId: req.user.userId,
        problemId,
        code,
        language: language || "cpp",
        status: "PENDING",
      },
    });

    // Enqueue background processing job into BullMQ
    await submissionQueue.add(
      "evaluate-submission",
      { submissionId: submission.id },
      { jobId: submission.id } // Ensures idempotent dispatch
    );

    res.status(201).json({
      message: "Submission received and queued for evaluation",
      submission: {
        id: submission.id,
        status: submission.status,
        createdAt: submission.createdAt,
      },
    });
  } catch (error) {
    console.error("Create submission error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getSubmissionById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            slug: true,
            difficulty: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!submission) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }

    res.json({ submission });
  } catch (error) {
    console.error("Get submission by id error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getSubmissions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { problemId, userId } = req.query;

    const where: any = {};
    if (problemId) where.problemId = String(problemId);
    if (userId) where.userId = String(userId);

    const submissions = await prisma.submission.findMany({
      where,
      select: {
        id: true,
        userId: true,
        problemId: true,
        status: true,
        executionTime: true,
        memoryUsed: true,
        failedTestCase: true,
        createdAt: true,
        problem: {
          select: {
            title: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json({ submissions });
  } catch (error) {
    console.error("Get submissions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

