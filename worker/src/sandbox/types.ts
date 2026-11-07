export enum Verdict {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  ACCEPTED = "ACCEPTED",
  WRONG_ANSWER = "WRONG_ANSWER",
  TIME_LIMIT_EXCEEDED = "TIME_LIMIT_EXCEEDED",
  MEMORY_LIMIT_EXCEEDED = "MEMORY_LIMIT_EXCEEDED",
  COMPILATION_ERROR = "COMPILATION_ERROR",
  RUNTIME_ERROR = "RUNTIME_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

export interface TestCase {
  id?: string;
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

export interface TestCaseResult {
  testCaseIndex: number; // 1-based index
  verdict: Verdict;
  executionTimeMs: number;
  stdout?: string;
  stderr?: string;
  expectedOutput?: string;
  input?: string;
  isHidden?: boolean;
}

export interface ExecutionResult {
  verdict: Verdict;
  executionTimeMs: number; // Peak execution time across test cases
  memoryUsedKb?: number;
  failedTestCaseIndex?: number; // 1-based index of failing test case
  errorMessage?: string; // Compiler error or runtime error
  stdout?: string; // Debug output from last executed test case
  testCaseResults: TestCaseResult[];
}

export interface SandboxConfig {
  timeLimitMs: number; // e.g. 2000
  memoryLimitMb: number; // e.g. 256
  cpus?: string; // default "1.0"
  pidsLimit?: number; // default 64
  compileTimeoutMs?: number; // default 10000
}

