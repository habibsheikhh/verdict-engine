import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { createProblemSchema, updateProblemSchema } from "../validators";

const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

export const createProblem = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = createProblemSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: "Validation failed", details: parseResult.error.format() });
      return;
    }

    const {
      title,
      slug: customSlug,
      description,
      difficulty,
      timeLimit,
      memoryLimit,
      templateCode,
      testCases,
    } = parseResult.data;

    const slug = customSlug || generateSlug(title);

    const existingProblem = await prisma.problem.findUnique({ where: { slug } });
    if (existingProblem) {
      res.status(409).json({ error: `Problem with slug '${slug}' already exists` });
      return;
    }

    const problem = await prisma.problem.create({
      data: {
        title,
        slug,
        description,
        difficulty,
        timeLimit,
        memoryLimit,
        templateCode,
        testCases: {
          create: testCases.map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden,
          })),
        },
      },
      include: {
        testCases: true,
      },
    });

    res.status(201).json({
      message: "Problem created successfully",
      problem,
    });
  } catch (error) {
    console.error("Create problem error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getProblems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { difficulty } = req.query;

    const whereClause: any = {};
    if (difficulty && ["EASY", "MEDIUM", "HARD"].includes(difficulty as string)) {
      whereClause.difficulty = difficulty;
    }

    const problems = await prisma.problem.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        timeLimit: true,
        memoryLimit: true,
        createdAt: true,
        _count: {
          select: {
            testCases: true,
            submissions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ problems });
  } catch (error) {
    console.error("Get problems error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getProblemBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const isAdmin = req.user?.role === "ADMIN";

    const problem = await prisma.problem.findUnique({
      where: { slug },
      include: {
        testCases: {
          // Admins can see all test cases; standard users only see public sample test cases
          where: isAdmin ? undefined : { isHidden: false },
          select: {
            id: true,
            input: true,
            expectedOutput: true,
            isHidden: true,
          },
        },
      },
    });

    if (!problem) {
      res.status(404).json({ error: "Problem not found" });
      return;
    }

    res.json({
      problem,
      // Metadata flag telling the frontend whether hidden test cases were omitted
      hasHiddenTestCasesOmitted: !isAdmin,
    });
  } catch (error) {
    console.error("Get problem by slug error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateProblem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const parseResult = updateProblemSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: "Validation failed", details: parseResult.error.format() });
      return;
    }

    const existing = await prisma.problem.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Problem not found" });
      return;
    }

    const { testCases, ...problemData } = parseResult.data;

    const updated = await prisma.$transaction(async (tx) => {
      if (testCases) {
        // Delete old test cases and insert updated ones
        await tx.testCase.deleteMany({ where: { problemId: id } });
        await tx.testCase.createMany({
          data: testCases.map((tc) => ({
            problemId: id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden,
          })),
        });
      }

      return tx.problem.update({
        where: { id },
        data: problemData,
        include: { testCases: true },
      });
    });

    res.json({
      message: "Problem updated successfully",
      problem: updated,
    });
  } catch (error) {
    console.error("Update problem error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteProblem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.problem.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Problem not found" });
      return;
    }

    await prisma.problem.delete({ where: { id } });

    res.json({ message: "Problem deleted successfully" });
  } catch (error) {
    console.error("Delete problem error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

