"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerSandboxExecutor = exports.normalizeOutput = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const crypto_1 = require("crypto");
const types_1 = require("./types");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const normalizeOutput = (str) => {
    return str
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n")
        .trim();
};
exports.normalizeOutput = normalizeOutput;
class DockerSandboxExecutor {
    baseTempDir;
    constructor(baseTempDir) {
        this.baseTempDir =
            baseTempDir || path_1.default.join(os_1.default.tmpdir(), "online-judge-sandboxes");
    }
    async init() {
        await promises_1.default.mkdir(this.baseTempDir, { recursive: true });
    }
    async createSandboxDir() {
        const sandboxDir = path_1.default.join(this.baseTempDir, `sub-${Date.now()}-${(0, crypto_1.randomUUID)().substring(0, 8)}`);
        await promises_1.default.mkdir(sandboxDir, { recursive: true });
        return sandboxDir;
    }
    async cleanupSandbox(sandboxDir) {
        try {
            await promises_1.default.rm(sandboxDir, { recursive: true, force: true });
        }
        catch (err) {
            console.warn(`[Sandbox] Failed to clean up ${sandboxDir}:`, err);
        }
    }
    async compileCpp(sourceCode, sandboxDir, timeoutMs = 10000) {
        const sourcePath = path_1.default.join(sandboxDir, "solution.cpp");
        await promises_1.default.writeFile(sourcePath, sourceCode, "utf8");
        const startTime = Date.now();
        const containerName = `oj-compile-${(0, crypto_1.randomUUID)().substring(0, 8)}`;
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
        }
        catch (err) {
            const durationMs = Date.now() - startTime;
            const errorOutput = (err.stderr || "") + (err.stdout ? "\n" + err.stdout : "");
            return {
                success: false,
                error: errorOutput.trim() || err.message || "Compilation failed",
                durationMs,
            };
        }
    }
    async executeTestCase(sandboxDir, testCase, testCaseIndex, config) {
        const inputPath = path_1.default.join(sandboxDir, "input.txt");
        await promises_1.default.writeFile(inputPath, testCase.input, "utf8");
        const containerName = `oj-exec-${(0, crypto_1.randomUUID)().substring(0, 8)}`;
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
        return new Promise((resolve) => {
            let isTimedOut = false;
            let stdoutBuffer = "";
            let stderrBuffer = "";
            const maxBufferLen = 1024 * 1024; // 1MB buffer cap
            const child = (0, child_process_1.spawn)("docker", dockerArgs);
            const watchdogTimer = setTimeout(() => {
                isTimedOut = true;
                // Host watchdog forceful container kill
                (0, child_process_1.execFile)("docker", ["kill", containerName], () => {
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
                let verdict;
                const trimmedStdout = stdoutBuffer.trim();
                const trimmedStderr = stderrBuffer.trim();
                // 1. Time Limit Exceeded Check
                if (isTimedOut || code === 124) {
                    verdict = types_1.Verdict.TIME_LIMIT_EXCEEDED;
                }
                // 2. Memory Limit Exceeded Check (SIGKILL 137 or SIGABRT 134 or OOM Killed output)
                else if ((code === 137 || code === 134) &&
                    (trimmedStdout.includes("Killed") ||
                        trimmedStderr.includes("Killed") ||
                        trimmedStderr.includes("bad_alloc") ||
                        trimmedStderr.includes("std::bad_alloc") ||
                        executionTimeMs < config.timeLimitMs)) {
                    verdict = types_1.Verdict.MEMORY_LIMIT_EXCEEDED;
                }
                // 3. Runtime Error Check (Segfault 139, FPE 136, abnormal exit)
                else if (code !== 0) {
                    verdict = types_1.Verdict.RUNTIME_ERROR;
                }
                // 4. Output Comparison
                else {
                    const actualNormalized = (0, exports.normalizeOutput)(stdoutBuffer);
                    const expectedNormalized = (0, exports.normalizeOutput)(testCase.expectedOutput);
                    if (actualNormalized === expectedNormalized) {
                        verdict = types_1.Verdict.ACCEPTED;
                    }
                    else {
                        verdict = types_1.Verdict.WRONG_ANSWER;
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
                    verdict: types_1.Verdict.INTERNAL_ERROR,
                    executionTimeMs: Date.now() - startTime,
                    stderr: err.message,
                });
            });
        });
    }
    async runSubmission(sourceCode, testCases, config) {
        await this.init();
        const sandboxDir = await this.createSandboxDir();
        try {
            // 1. Compile Phase
            const compileResult = await this.compileCpp(sourceCode, sandboxDir, config.compileTimeoutMs || 10000);
            if (!compileResult.success) {
                return {
                    verdict: types_1.Verdict.COMPILATION_ERROR,
                    executionTimeMs: compileResult.durationMs,
                    errorMessage: compileResult.error,
                    testCaseResults: [],
                };
            }
            // 2. Test Cases Execution Phase (Sequential with early-exit on first failure)
            const testCaseResults = [];
            let maxExecutionTimeMs = 0;
            let finalVerdict = types_1.Verdict.ACCEPTED;
            let failedTestCaseIndex;
            let lastStdout;
            let failureError;
            for (let i = 0; i < testCases.length; i++) {
                const tc = testCases[i];
                const result = await this.executeTestCase(sandboxDir, tc, i + 1, config);
                testCaseResults.push(result);
                maxExecutionTimeMs = Math.max(maxExecutionTimeMs, result.executionTimeMs);
                lastStdout = result.stdout;
                if (result.verdict !== types_1.Verdict.ACCEPTED) {
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
        }
        finally {
            await this.cleanupSandbox(sandboxDir);
        }
    }
}
exports.DockerSandboxExecutor = DockerSandboxExecutor;
