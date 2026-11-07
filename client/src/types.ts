export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type Verdict =
  | "PENDING"
  | "PROCESSING"
  | "ACCEPTED"
  | "WRONG_ANSWER"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED"
  | "COMPILATION_ERROR"
  | "RUNTIME_ERROR"
  | "INTERNAL_ERROR";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface Problem {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: Difficulty;
  timeLimit: number;
  memoryLimit: number;
  templateCode: string;
  testCases?: TestCase[];
  _count?: {
    testCases: number;
    submissions: number;
  };
  createdAt: string;
}

export interface Submission {
  id: string;
  userId: string;
  problemId: string;
  code?: string;
  language: string;
  status: Verdict;
  executionTime?: number | null;
  memoryUsed?: number | null;
  failedTestCase?: number | null;
  errorMessage?: string | null;
  stdout?: string | null;
  createdAt: string;
  problem?: {
    title: string;
    slug: string;
    difficulty?: Difficulty;
  };
}

