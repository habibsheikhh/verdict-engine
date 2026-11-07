import fs from "fs/promises";
import path from "path";
import os from "os";
import { spawn, execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import {
  Verdict,
  TestCase,
  TestCaseResult,
  ExecutionResult,
  SandboxConfig,
} from "./types";

const execFileAsync = promisify(execFile);

export const normalizeOutput = (str: string): string => {
  return str
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
};

export class DockerSandboxExecutor {
  private baseTempDir: string;

  constructor(baseTempDir?: string) {
    this.baseTempDir =
      baseTempDir || path.join(os.tmpdir(), "online-judge-sandboxes");
  }

  public async init(): Promise<void> {
    await fs.mkdir(this.baseTempDir, { recursive: true });
  }

  public async createSandboxDir(): Promise<string> {
    const sandboxDir = path.join(
      this.baseTempDir,
      `sub-${Date.now()}-${randomUUID().substring(0, 8)}`
    );
    await fs.mkdir(sandboxDir, { recursive: true });
    return sandboxDir;
  }

  public async cleanupSandbox(sandboxDir: string): Promise<void> {
    try {
      await fs.rm(sandboxDir, { recursive: true, force: true });
    } catch (err) {
      console.warn(`[Sandbox] Failed to clean up ${sandboxDir}:`, err);
    }
  }

  public async compileCpp(
    sourceCode: string,
    sandboxDir: string,
    timeoutMs = 10000
  ): Promise<{ success: boolean; error?: string; durationMs: number }> {
    const sourcePath = path.join(sandboxDir, "solution.cpp");
    await fs.writeFile(sourcePath, sourceCode, "utf8");

    const startTime = Date.now();
    const containerName = `oj-compile-${randomUUID().substring(0, 8)}`;

    const args = [
      "run",
      "--rm",
      "--name",
      containerName,
      "--network",
      "none",
      "--memory",
      "512m",
      "--memory-swap",
      "512m",
      "--cpus",
      "1.0",
      "-v",
      `${sandboxDir}:/build`,
      "-w",
      "/build",
      "gcc:latest",
      "g++",
      "-O2",
      "-std=c++17",
      "-Wall",
      "solution.cpp",
      "-o",
      "solution",
    ];

    try {
      const { stdout, stderr } = await execFileAsync("docker", args, {
        timeout: timeoutMs,
        maxBuffer: 2 * 1024 * 1024,
      });

      const durationMs = Date.now() - startTime;
      return { success: true, durationMs };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorOutput =
        (err.stderr || "") + (err.stdout ? "\n" + err.stdout : "");
      return {
        success: false,
        error: errorOutput.trim() || err.message || "Compilation failed",
        durationMs,
      };
    }
  }

  public async executeTestCase(
    sandboxDir: string,
    testCase: TestCase,
    testCaseIndex: number,
    config: SandboxConfig
  ): Promise<TestCaseResult> {
    const inputPath = path.join(sandboxDir, "input.txt");
    await fs.writeFile(inputPath, testCase.input, "utf8");

    const containerName = `oj-exec-${randomUUID().substring(0, 8)}`;
    const timeLimitSec = (config.timeLimitMs / 1000).toFixed(2);
    const hostWatchdogMs = config.timeLimitMs + 2500;

    const dockerArgs = [
      "run",
      "--rm",
      "--name",
      containerName,
      "--read-only",
      "--network",
      "none",
      "--memory",
      `${config.memoryLimitMb}m`,
      "--memory-swap",
      `${config.memoryLimitMb}m`,
      "--cpus",
      config.cpus || "1.0",
      "--pids-limit",
      `${config.pidsLimit || 64}`,
      "--tmpfs",
      "/tmp:rw,noexec,nosuid,size=16m",
      "-v",
      `${sandboxDir}:/sandbox:ro`,
      "-w",
      "/sandbox",
      "gcc:latest",
      "sh",
      "-c",
      `/usr/bin/timeout -k 0.2s ${timeLimitSec}s ./solution < input.txt`,
    ];

    const startTime = Date.now();

    return new Promise<TestCaseResult>((resolve) => {
      let isTimedOut = false;
      let stdoutBuffer = "";
      let stderrBuffer = "";
      const maxBufferLen = 1024 * 1024; // 1MB buffer cap

      const child = spawn("docker", dockerArgs);

      const watchdogTimer = setTimeout(() => {
        isTimedOut = true;
        // Host watchdog forceful container kill
        execFile("docker", ["kill", containerName], () => {
          child.kill("SIGKILL");
        });
      }, hostWatchdogMs);

      child.stdout.on("data", (data) => {
        if (stdoutBuffer.length < maxBufferLen) {
          stdoutBuffer += data.toString();
        }
      });

      child.stderr.on("data", (data) => {
        if (stderrBuffer.length < maxBufferLen) {
          stderrBuffer += data.toString();
        }
      });

      child.on("close", (code) => {
        clearTimeout(watchdogTimer);
        const executionTimeMs = Date.now() - startTime;

        let verdict: Verdict;
        const trimmedStdout = stdoutBuffer.trim();
        const trimmedStderr = stderrBuffer.trim();

        // 1. Time Limit Exceeded Check
        if (isTimedOut || code === 124) {
          verdict = Verdict.TIME_LIMIT_EXCEEDED;
        }
        // 2. Memory Limit Exceeded Check (SIGKILL 137 or SIGABRT 134 or OOM Killed output)
        else if (
          (code === 137 || code === 134) &&
          (trimmedStdout.includes("Killed") ||
            trimmedStderr.includes("Killed") ||
            trimmedStderr.includes("bad_alloc") ||
            trimmedStderr.includes("std::bad_alloc") ||
            executionTimeMs < config.timeLimitMs)
        ) {
          verdict = Verdict.MEMORY_LIMIT_EXCEEDED;
        }
        // 3. Runtime Error Check (Segfault 139, FPE 136, abnormal exit)
        else if (code !== 0) {
          verdict = Verdict.RUNTIME_ERROR;
        }
        // 4. Output Comparison
        else {
          const actualNormalized = normalizeOutput(stdoutBuffer);
          const expectedNormalized = normalizeOutput(testCase.expectedOutput);

          if (actualNormalized === expectedNormalized) {
            verdict = Verdict.ACCEPTED;
          } else {
            verdict = Verdict.WRONG_ANSWER;
          }
        }

        resolve({
          testCaseIndex,
          verdict,
          executionTimeMs,
          stdout: stdoutBuffer,
          stderr: stderrBuffer,
          expectedOutput: testCase.expectedOutput,
          input: testCase.isHidden ? undefined : testCase.input,
          isHidden: testCase.isHidden,
        });
      });

      child.on("error", (err) => {
        clearTimeout(watchdogTimer);
        resolve({
          testCaseIndex,
          verdict: Verdict.INTERNAL_ERROR,
          executionTimeMs: Date.now() - startTime,
          stderr: err.message,
        });
      });
    });
  }

  public async runSubmission(
    sourceCode: string,
    testCases: TestCase[],
    config: SandboxConfig
  ): Promise<ExecutionResult> {
    await this.init();
    const sandboxDir = await this.createSandboxDir();

    try {
      // 1. Compile Phase
      const compileResult = await this.compileCpp(
        sourceCode,
        sandboxDir,
        config.compileTimeoutMs || 10000
      );

      if (!compileResult.success) {
        return {
          verdict: Verdict.COMPILATION_ERROR,
          executionTimeMs: compileResult.durationMs,
          errorMessage: compileResult.error,
          testCaseResults: [],
        };
      }

      // 2. Test Cases Execution Phase (Sequential with early-exit on first failure)
      const testCaseResults: TestCaseResult[] = [];
      let maxExecutionTimeMs = 0;
      let finalVerdict = Verdict.ACCEPTED;
      let failedTestCaseIndex: number | undefined;
      let lastStdout: string | undefined;
      let failureError: string | undefined;

      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const result = await this.executeTestCase(
          sandboxDir,
          tc,
          i + 1,
          config
        );

        testCaseResults.push(result);
        maxExecutionTimeMs = Math.max(maxExecutionTimeMs, result.executionTimeMs);
        lastStdout = result.stdout;

        if (result.verdict !== Verdict.ACCEPTED) {
          finalVerdict = result.verdict;
          failedTestCaseIndex = i + 1;
          failureError = result.stderr || undefined;
          break; // Stop immediately upon first failing test case
        }
      }

      return {
        verdict: finalVerdict,
        executionTimeMs: maxExecutionTimeMs,
        failedTestCaseIndex,
        errorMessage: failureError,
        stdout: lastStdout,
        testCaseResults,
      };
    } finally {
      await this.cleanupSandbox(sandboxDir);
    }
  }
}

