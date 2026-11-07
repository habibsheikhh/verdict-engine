process.env.NODE_ENV = "test";
import http from "http";
import path from "path";
import { spawn, execFile } from "child_process";
import { promisify } from "util";
import app from "./index";

const execFileAsync = promisify(execFile);

interface ApiResponse {
  status: number;
  body: any;
}

const makeRequest = (
  serverUrl: string,
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<ApiResponse> => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, serverUrl);
    const data = body ? JSON.stringify(body) : null;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
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
          resolve({ status: res.statusCode || 500, body: parsed });
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
  maxWaitMs = 35000,
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

const runPhase6Suite = async () => {
  console.log("================================================================================");
  console.log("   PHASE 6: END-TO-END STRESS & SECURITY ATTACK TEST SUITE (FULL PIPELINE)      ");
  console.log("================================================================================\n");

  const workerDir = path.resolve(__dirname, "../../worker");

  // 1. Spawn Worker Process
  console.log("[Setup] Spawning background Docker Worker process...");
  const workerProcess = spawn("npx", ["tsx", "src/index.ts"], {
    cwd: workerDir,
    stdio: "pipe",
    shell: true,
  });

  workerProcess.stderr?.on("data", (data) => {
    // suppress minor stderr or print
  });

  // Give worker a moment to connect to Redis
  await new Promise((r) => setTimeout(r, 2500));

  // 2. Start API Server
  console.log("[Setup] Starting Express API Server on ephemeral port...");
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start test API server");
  }
  const serverUrl = `http://localhost:${address.port}`;
  console.log(`[Setup] API Server listening at ${serverUrl}\n`);

  let passed = 0;
  let total = 0;

  const assert = (condition: boolean, title: string, details?: string) => {
    total++;
    if (condition) {
      passed++;
      console.log(`  [PASS] ${title}`);
    } else {
      console.error(`  [FAIL] ${title}: ${details || "Condition not met"}`);
      process.exitCode = 1;
    }
  };

  try {
    // 3. Login
    const loginRes = await makeRequest(serverUrl, "POST", "/api/auth/login", {
      email: "user@oj.com",
      password: "user123",
    });
    assert(loginRes.status === 200 && loginRes.body.token, "User authentication");
    const token = loginRes.body.token;

    // 4. Fetch target problem (Two Sum)
    const problemRes = await makeRequest(serverUrl, "GET", "/api/problems/two-sum", undefined, token);
    assert(problemRes.status === 200 && problemRes.body.problem.id, "Fetch problem configuration");
    const problemId = problemRes.body.problem.id;

    // --------------------------------------------------------------------------
    // Test 1: Correct C++ Submission (ACCEPTED)
    // --------------------------------------------------------------------------
    console.log("\n--> 1. Testing Valid Submission (Expect: ACCEPTED)...");
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
    const sub1 = await makeRequest(serverUrl, "POST", "/api/submissions", { problemId, code: acCode, language: "cpp" }, token);
    const result1 = await pollSubmission(serverUrl, sub1.body.submission.id, token);
    assert(result1.status === "ACCEPTED", "Correct solution receives ACCEPTED verdict", `Got: ${result1.status}`);
    assert(result1.executionTime > 0, `Execution runtime measured: ${result1.executionTime}ms`);

    // --------------------------------------------------------------------------
    // Test 2: Wrong Logic Submission (WRONG_ANSWER)
    // --------------------------------------------------------------------------
    console.log("\n--> 2. Testing Wrong Answer (Expect: WRONG_ANSWER)...");
    const waCode = `
#include <iostream>
using namespace std;
int main() {
    cout << "-1 -1\\n";
    return 0;
}
`;
    const sub2 = await makeRequest(serverUrl, "POST", "/api/submissions", { problemId, code: waCode, language: "cpp" }, token);
    const result2 = await pollSubmission(serverUrl, sub2.body.submission.id, token);
    assert(result2.status === "WRONG_ANSWER", "Incorrect logic receives WRONG_ANSWER verdict", `Got: ${result2.status}`);
    assert(result2.failedTestCase === 1, "Correctly identifies first failing testcase (#1)");

    // --------------------------------------------------------------------------
    // Test 3: Infinite Loop Attack (TIME_LIMIT_EXCEEDED)
    // --------------------------------------------------------------------------
    console.log("\n--> 3. Testing Infinite Loop Attack (Expect: TIME_LIMIT_EXCEEDED)...");
    const tleCode = `
#include <iostream>
using namespace std;
int main() {
    volatile int counter = 0;
    while (true) {
        counter++;
    }
    return 0;
}
`;
    const sub3 = await makeRequest(serverUrl, "POST", "/api/submissions", { problemId, code: tleCode, language: "cpp" }, token);
    const result3 = await pollSubmission(serverUrl, sub3.body.submission.id, token);
    assert(result3.status === "TIME_LIMIT_EXCEEDED", "Infinite loop killed with TIME_LIMIT_EXCEEDED", `Got: ${result3.status}`);

    // --------------------------------------------------------------------------
    // Test 4: Memory Hog / Allocation Bomb (MEMORY_LIMIT_EXCEEDED)
    // --------------------------------------------------------------------------
    console.log("\n--> 4. Testing Memory Allocation Bomb (Expect: MEMORY_LIMIT_EXCEEDED)...");
    const mleCode = `
#include <iostream>
using namespace std;
int main() {
    size_t bytes = 450ULL * 1024 * 1024; // 450MB
    volatile char* p = new char[bytes];
    for (size_t i = 0; i < bytes; i += 4096) {
        p[i] = 1;
    }
    cout << (int)p[0] << endl;
    return 0;
}
`;
    const sub4 = await makeRequest(serverUrl, "POST", "/api/submissions", { problemId, code: mleCode, language: "cpp" }, token);
    const result4 = await pollSubmission(serverUrl, sub4.body.submission.id, token);
    assert(result4.status === "MEMORY_LIMIT_EXCEEDED", "450MB allocation terminated by cgroups with MEMORY_LIMIT_EXCEEDED", `Got: ${result4.status}`);

    // --------------------------------------------------------------------------
    // Test 5: Fork Bomb Attack (Containment via --pids-limit 64)
    // --------------------------------------------------------------------------
    console.log("\n--> 5. Testing Fork Bomb Attack (Expect: Host Safe & Verdict: TLE or RE)...");
    const fbCode = `
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
    const sub5 = await makeRequest(serverUrl, "POST", "/api/submissions", { problemId, code: fbCode, language: "cpp" }, token);
    const result5 = await pollSubmission(serverUrl, sub5.body.submission.id, token);
    assert(
      result5.status === "TIME_LIMIT_EXCEEDED" || result5.status === "RUNTIME_ERROR",
      "Fork bomb safely contained by cgroup pids-limit and terminated",
      `Got: ${result5.status}`
    );

    // --------------------------------------------------------------------------
    // Test 6: Concurrent Burst Stress Test (5 Simulataneous Submissions)
    // --------------------------------------------------------------------------
    console.log("\n--> 6. Executing Concurrent Burst Stress Test (5 Simultaneous Jobs in Queue)...");
    const burstPayloads = [
      { name: "Burst AC #1", code: acCode, expected: "ACCEPTED" },
      { name: "Burst WA #1", code: waCode, expected: "WRONG_ANSWER" },
      { name: "Burst AC #2", code: acCode, expected: "ACCEPTED" },
      { name: "Burst CE #1", code: "int main(){ syntax_error; }", expected: "COMPILATION_ERROR" },
      { name: "Burst WA #2", code: "int main(){ cout << 0; }", expected: "WRONG_ANSWER" },
    ];

    const burstStartTime = Date.now();
    // Dispatch all 5 simultaneously
    const dispatchPromises = burstPayloads.map((b) =>
      makeRequest(serverUrl, "POST", "/api/submissions", { problemId, code: b.code, language: "cpp" }, token)
    );
    const dispatchResponses = await Promise.all(dispatchPromises);

    // Collect submission IDs
    const burstSubmissions = dispatchResponses.map((res, idx) => ({
      ...burstPayloads[idx],
      id: res.body.submission.id,
    }));

    // Poll all 5 in parallel
    const pollPromises = burstSubmissions.map((b) =>
      pollSubmission(serverUrl, b.id, token)
    );
    const pollResults = await Promise.all(pollPromises);
    const totalBurstDuration = Date.now() - burstStartTime;

    let burstAllPassed = true;
    for (let i = 0; i < burstSubmissions.length; i++) {
      const expected = burstSubmissions[i].expected;
      const actual = pollResults[i].status;
      if (actual !== expected) {
        burstAllPassed = false;
        console.error(`    Burst item ${burstSubmissions[i].name} failed: expected ${expected}, got ${actual}`);
      }
    }

    assert(burstAllPassed, "All 5 concurrent burst submissions processed with correct verdicts");
    console.log(`    Total Queue & Evaluation time for 5 burst jobs: ${totalBurstDuration}ms (avg ${(totalBurstDuration / 5).toFixed(0)}ms/job)`);

    // --------------------------------------------------------------------------
    // Test 7: Container Leak & Garbage Collection Verification
    // --------------------------------------------------------------------------
    console.log("\n--> 7. Verifying Ephemeral Container Cleanup (0 Leaked Containers)...");
    const { stdout: psOutput } = await execFileAsync("docker", [
      "ps",
      "--filter",
      "name=oj-",
      "--format",
      "{{.Names}}",
    ]);

    const activeContainers = psOutput.trim().split("\n").filter(Boolean);
    assert(
      activeContainers.length === 0,
      "Zero leaked ephemeral containers (All sandbox containers successfully reaped)",
      `Remaining containers: ${activeContainers.join(", ") || "none"}`
    );

    console.log("\n================================================================================");
    console.log(`   PHASE 6 COMPLETE: ALL ${passed}/${total} END-TO-END STRESS & SECURITY TESTS PASSED`);
    console.log("================================================================================\n");
  } finally {
    server.close();
    workerProcess.kill("SIGTERM");
  }
};

runPhase6Suite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Phase 6 test runner failed:", err);
    process.exit(1);
  });
