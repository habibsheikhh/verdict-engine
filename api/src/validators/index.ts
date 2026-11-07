import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["USER", "ADMIN"]).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const testCaseSchema = z.object({
  input: z.string(),
  expectedOutput: z.string(),
  isHidden: z.boolean().default(true),
});

export const createProblemSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  slug: z.string().min(3).optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("EASY"),
  timeLimit: z.number().int().min(100).max(10000).default(2000),
  memoryLimit: z.number().int().min(16).max(1024).default(256),
  templateCode: z.string().min(1, "Template code is required"),
  testCases: z.array(testCaseSchema).min(1, "At least one testcase is required"),
});

export const updateProblemSchema = z.object({
  title: z.string().min(3).optional(),
  slug: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  timeLimit: z.number().int().min(100).max(10000).optional(),
  memoryLimit: z.number().int().min(16).max(1024).optional(),
  templateCode: z.string().optional(),
  testCases: z.array(testCaseSchema).optional(),
});

export const createSubmissionSchema = z.object({
  problemId: z.string().uuid("Invalid problem ID"),
  code: z.string().min(1, "Code cannot be empty"),
  language: z.string().default("cpp"),
});

