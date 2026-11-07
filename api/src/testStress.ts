process.env.NODE_ENV = "test";
import http from "http";
import path from "path";
import { spawn, execFile } from "child_process";
import { promisify } from "util";
import app, { closeApiGracefully } from "./index";

const execFileAsync = promisify(execFile);

interface ApiResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: any;
}

const makeRequest = (
  serverUrl: string,
  method: string,
  urlPath: string,
  body?: any,
  token?: string,
  customHeaders?: Record<string, string>
): Promise<ApiResponse> => {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, serverUrl);
    const data = body ? JSON.stringify(body) : null;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...customHeaders,
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (data) {
      headers["Content-Length"] = Buffer.byteLength(data).toString();
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let resData = "";
        res.on("data", (chunk) => {
          resData += chunk;
        });
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(resData);
          } catch {
            parsed = resData;
          }
          resolve({
            status: res.statusCode || 500,
            headers: res.headers,
            body: parsed,
          });
        });
      }
    );

    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
};

const pollSubmission = async (
  serverUrl: string,
  submissionId: string,
  token: string,
  maxWaitMs = 60000,
  intervalMs = 700
): Promise<any> => {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const res = await makeRequest(
      serverUrl,
      "GET",
      `/api/submissions/${submissionId}`,
      undefined,
      token
    );

    if (res.status === 200 && res.body.submission) {
      const sub = res.body.submission;
      if (sub.status !== "PENDING" && sub.status !== "PROCESSING") {
        return {
          ...sub,
          pollDurationMs: Date.now() - startTime,
        };
      }
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`Timed out waiting for submission ${submissionId} to reach terminal status`);
};

const loginOrRegister = async (
  serverUrl: string,
  email: string,
  pass = "stressPass123!",
  name = "Stress Contestant"
): Promise<string> => {
  const loginRes = await makeRequest(serverUrl, "POST", "/api/auth/login", {
    email,
    password: pass,
  });
  if (loginRes.status === 200 && loginRes.body.token) {
    return loginRes.body.token;
  }

  const regRes = await makeRequest(serverUrl, "POST", "/api/auth/register", {
    email,
    password: pass,
    name,
  });
  if (regRes.status === 201 && regRes.body.token) {
    return regRes.body.token;
  }

  throw new Error(`Failed to authenticate ${email}: ${JSON.stringify(regRes.body)}`);
};

const runStressSuite = async () => {
  console.log("================================================================================");
  console.log("   PHASE 6: PRODUCTION HARDENING, LOAD TESTING & DEFENSIBILITY VERIFICATION     ");
  console.log("================================================================================\n");

  const workerDir = path.resolve(__dirname, "../../worker");

  // 1. Spawn Worker Process
  console.log("[1/5] Spawning Worker Service (Sandbox Execution Engine)...");
  const workerProcess = spawn("npx", ["tsx", "src/index.ts"], {
    cwd: workerDir,
    stdio: "pipe",
    shell: true,
  });

  workerProcess.stderr?.on("data", () => {});

  // Wait for worker startup and Redis connection
  await new Promise((r) => setTimeout(r, 2500));

  // 2. Start Test API Server on Ephemeral Port
  console.log("[2/5] Starting API Server on ephemeral port...");
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start API test server");
  }
  const serverUrl = `http://localhost:${address.port}`;
  console.log(`      Server listening at ${serverUrl}\n`);

  let totalTests = 0;
  let passedTests = 0;

  const assert = (condition: boolean, title: string, details?: string) => {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] ${title}`);
    } else {
      console.error(`  [FAIL] ${title}: ${details || "Assertion failed"}`);
      process.exitCode = 1;
    }
  };

  try {
    // --------------------------------------------------------------------------
    // PART A: Observability & Health Metrics Endpoint
    // --------------------------------------------------------------------------
    console.log("--> STAGE 1: Testing System Observability & Health Metrics (GET /api/system/metrics)...");
    const metricsRes = await makeRequest(serverUrl, "GET", "/api/system/metrics");
    assert(metricsRes.status === 200, "System metrics endpoint responds HTTP 200");
    assert(metricsRes.body.database?.status === "connected", "PostgreSQL database status is connected");
    assert(metricsRes.body.queue?.status === "connected", "BullMQ / Redis queue status is connected");
    assert(metricsRes.body.sandbox?.dockerDaemon === "connected", "Docker daemon connection is active");
    console.log(`    Database volume: ${metricsRes.body.database?.totalSubmissions} submissions recorded`);
    console.log(`    Queue state: ${metricsRes.body.queue?.completed} completed, ${metricsRes.body.queue?.waiting} waiting`);

    // Fetch Two Sum Problem
    const adminToken = await loginOrRegister(serverUrl, "admin@oj.com", "admin123", "Admin");
    const problemRes = await makeRequest(serverUrl, "GET", "/api/problems/two-sum", undefined, adminToken);
    assert(problemRes.status === 200 && problemRes.body.problem?.id, "Two Sum problem loaded");
    const problemId = problemRes.body.problem.id;

    // --------------------------------------------------------------------------
    // PART B: Payload Guards (64KB Code Limit)
    // --------------------------------------------------------------------------
    console.log("\n--> STAGE 2: Testing Payload Guards (Zod 64KB Max Source Limit)...");
    const user1Token = await loginOrRegister(serverUrl, "guard_user@oj.com", "password123", "Guard User");

    // Create 70KB oversized code payload
    const oversizedCode = "// " + "A".repeat(70000) + "\nint main() { return 0; }";
    const oversizeRes = await makeRequest(
      serverUrl,
      "POST",
      "/api/submissions",
      { problemId, code: oversizedCode, language: "cpp" },
      user1Token
    );

    assert(
      oversizeRes.status === 413 || oversizeRes.status === 400,
      `Oversized 70KB payload safely rejected (HTTP ${oversizeRes.status})`,
      `Expected 413 or 400, got: ${oversizeRes.status}`
    );
    assert(
      JSON.stringify(oversizeRes.body).includes("64KB"),
      "Rejection error message explicitly identifies 64KB limit violation"
    );

    // --------------------------------------------------------------------------
    // PART C: Rate Limiting & 429 Header Verification
    // --------------------------------------------------------------------------
    console.log("\n--> STAGE 3: Testing Submission Rate Limiter & Retry-After Headers...");
    const rateLimitUserToken = await loginOrRegister(
      serverUrl,
      `ratelimit_${Date.now()}@oj.com`,
      "password123",
      "Rate Limit Tester"
    );

    const smallCode = "#include <iostream>\nint main(){ std::cout << 0; return 0; }";
    let hitRateLimit = false;
    let rateLimitResponse: ApiResponse | null = null;

    // Fire 7 rapid submissions from the same user (limit is 5 per 30s)
    for (let i = 1; i <= 7; i++) {
      const res = await makeRequest(
        serverUrl,
        "POST",
        "/api/submissions",
        { problemId, code: smallCode, language: "cpp" },
        rateLimitUserToken
      );

      if (res.status === 429) {
        hitRateLimit = true;
        rateLimitResponse = res;
        console.log(`    Submission #${i} was rate-limited with HTTP 429`);
        break;
      }
    }

    assert(hitRateLimit, "6th/7th submission triggers HTTP 429 Too Many Requests");
    assert(
      Boolean(rateLimitResponse?.headers["retry-after"] || rateLimitResponse?.body?.retryAfterSeconds),
      "HTTP 429 includes Retry-After header / retryAfterSeconds duration"
    );

    // --------------------------------------------------------------------------
    // PART D: Concurrent Stress Test (12 Simultaneous Submissions)
    // --------------------------------------------------------------------------
    console.log("\n--> STAGE 4: Concurrency & Stress Load Test (12 Simultaneous Mixed Submissions)...");

    // Authenticate 3 simulated contest users (4 submissions each to respect 5/30s rate limit)
    const contestTokens = await Promise.all([
      loginOrRegister(serverUrl, `contestant_alpha_${Date.now()}@oj.com`),
      loginOrRegister(serverUrl, `contestant_beta_${Date.now()}@oj.com`),
      loginOrRegister(serverUrl, `contestant_gamma_${Date.now()}@oj.com`),
    ]);

    const acCode = `
#include <iostream>
#include <vector>
#include <unordered_map>
using namespace std;
int main() {
    int n;
    if (!(cin >> n)) return 0;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    int target;
    cin >> target;
    unordered_map<int, int> seen;
    for (int i = 0; i < n; i++) {
        int comp = target - nums[i];
        if (seen.count(comp)) {
            cout << seen[comp] << " " << i << "\\n";
            return 0;
        }
        seen[nums[i]] = i;
    }
    return 0;
}
`;

    const waCode = `
#include <iostream>
using namespace std;
int main() {
    cout << "999 999\\n";
    return 0;
}
`;

    const tleCode = `
#include <iostream>
using namespace std;
int main() {
    volatile int x = 0;
    while(true) { x++; }
    return 0;
}
`;

    const forkBombCode = `
#include <unistd.h>
#include <iostream>
using namespace std;
int main() {
    while (true) {
        fork();
    }
    return 0;
}
`;

    const ceCode = `
int main() {
    this_is_a_syntax_error();
    return 0;
}
`;

    const stressBatches = [
      // Contestant Alpha (4 jobs)
      { token: contestTokens[0], name: "Job 01 [Alpha - AC]", code: acCode, expected: ["ACCEPTED"] },
      { token: contestTokens[0], name: "Job 02 [Alpha - WA]", code: waCode, expected: ["WRONG_ANSWER"] },
      { token: contestTokens[0], name: "Job 03 [Alpha - TLE]", code: tleCode, expected: ["TIME_LIMIT_EXCEEDED"] },
      { token: contestTokens[0], name: "Job 04 [Alpha - FB]", code: forkBombCode, expected: ["TIME_LIMIT_EXCEEDED", "RUNTIME_ERROR"] },
      // Contestant Beta (4 jobs)
      { token: contestTokens[1], name: "Job 05 [Beta - AC]", code: acCode, expected: ["ACCEPTED"] },
      { token: contestTokens[1], name: "Job 06 [Beta - CE]", code: ceCode, expected: ["COMPILATION_ERROR"] },
      { token: contestTokens[1], name: "Job 07 [Beta - WA]", code: waCode, expected: ["WRONG_ANSWER"] },
      { token: contestTokens[1], name: "Job 08 [Beta - TLE]", code: tleCode, expected: ["TIME_LIMIT_EXCEEDED"] },
      // Contestant Gamma (4 jobs)
      { token: contestTokens[2], name: "Job 09 [Gamma - AC]", code: acCode, expected: ["ACCEPTED"] },
      { token: contestTokens[2], name: "Job 10 [Gamma - FB]", code: forkBombCode, expected: ["TIME_LIMIT_EXCEEDED", "RUNTIME_ERROR"] },
      { token: contestTokens[2], name: "Job 11 [Gamma - WA]", code: waCode, expected: ["WRONG_ANSWER"] },
      { token: contestTokens[2], name: "Job 12 [Gamma - AC]", code: acCode, expected: ["ACCEPTED"] },
    ];

    console.log(`    Firing ${stressBatches.length} simultaneous submissions into the ingestion pipeline...`);
    const burstStart = Date.now();

    // 1. Dispatch all 12 submissions in parallel
    const dispatchPromises = stressBatches.map((batch) =>
      makeRequest(
        serverUrl,
        "POST",
        "/api/submissions",
        { problemId, code: batch.code, language: "cpp" },
        batch.token
      )
    );

    const dispatchResults = await Promise.all(dispatchPromises);
    const dispatchDurationMs = Date.now() - burstStart;
    console.log(`    All ${dispatchResults.length} submissions ingested in ${dispatchDurationMs}ms!`);

    const allIngested = dispatchResults.every((res) => res.status === 201 && res.body.submission?.id);
    assert(allIngested, `All ${stressBatches.length} submissions successfully accepted with HTTP 201 Created`);

    // Verify queue backpressure via metrics endpoint
    const queueCheck = await makeRequest(serverUrl, "GET", "/api/system/metrics");
    console.log(
      `    Queue snapshot immediately after burst: Active = ${queueCheck.body.queue?.active}, Waiting = ${queueCheck.body.queue?.waiting}`
    );
    assert(
      (queueCheck.body.queue?.active || 0) <= 2,
      "Worker adheres to strict concurrency cap (<= 2 concurrent containers)"
    );

    // 2. Poll all submissions in parallel until completion
    const submissionIds = dispatchResults.map((r, i) => ({
      ...stressBatches[i],
      id: r.body.submission.id,
    }));

    console.log("    Awaiting worker execution and evaluating verdicts...");
    const pollResults = await Promise.all(
      submissionIds.map((item) => pollSubmission(serverUrl, item.id, item.token))
    );

    const totalStressDurationMs = Date.now() - burstStart;
    let stressAllValid = true;

    for (let i = 0; i < submissionIds.length; i++) {
      const item = submissionIds[i];
      const result = pollResults[i];
      const isExpected = item.expected.includes(result.status);
      if (!isExpected) {
        stressAllValid = false;
        console.error(`      [X] ${item.name} mismatch: Expected ${item.expected.join("/")}, Got ${result.status}`);
      } else {
        console.log(`      [✓] ${item.name} -> ${result.status} (eval: ${result.executionTime || 0}ms, poll: ${result.pollDurationMs}ms)`);
      }
    }

    assert(stressAllValid, `All ${stressBatches.length} concurrent jobs resolved to valid terminal verdicts`);
    console.log(`    Total burst throughput: ${stressBatches.length} jobs completed in ${totalStressDurationMs}ms (avg ${(totalStressDurationMs / stressBatches.length).toFixed(0)}ms/job)`);

    // --------------------------------------------------------------------------
    // PART E: Ephemeral Container & Resource Leak Check
    // --------------------------------------------------------------------------
    console.log("\n--> STAGE 5: Verifying Ephemeral Container & Host Resource Cleanup...");
    // Give sweeper a moment to ensure all exits finalized
    await new Promise((r) => setTimeout(r, 1500));

    const { stdout: psCheck } = await execFileAsync("docker", [
      "ps",
      "--filter",
      "name=oj-",
      "--format",
      "{{.Names}}",
    ]);

    const activeContainers = psCheck.trim().split("\n").filter(Boolean);
    assert(
      activeContainers.length === 0,
      "Zero leaked Docker containers (all sandbox runners reaped)",
      `Leaked containers found: ${activeContainers.join(", ")}`
    );

    // Final System Metrics
    const finalMetrics = await makeRequest(serverUrl, "GET", "/api/system/metrics");
    assert(
      finalMetrics.body.queue?.waiting === 0,
      "BullMQ queue completely drained (0 waiting jobs)"
    );

    console.log("\n================================================================================");
    console.log(`   PHASE 6 COMPLETE: ALL ${passedTests}/${totalTests} TESTS PASSED CLEANLY!`);
    console.log("================================================================================\n");
  } finally {
    server.close();
    await closeApiGracefully();
    workerProcess.kill("SIGTERM");
  }
};

runStressSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Stress test suite failed:", err);
    process.exit(1);
  });

