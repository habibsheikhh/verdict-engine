process.env.NODE_ENV = "test";
import http from "http";
import path from "path";
import { spawn } from "child_process";
import app from "./index";

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
  maxWaitMs = 30000,
  intervalMs = 800
): Promise<any> => {
  const startTime = Date.now();
  let seenProcessing = false;

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
      if (sub.status === "PROCESSING") {
        seenProcessing = true;
      }
      if (sub.status !== "PENDING" && sub.status !== "PROCESSING") {
        return { submission: sub, seenProcessing };
      }
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`Timed out waiting for submission ${submissionId} to complete`);
};

const runPhase4Tests = async () => {
  console.log("==================================================================");
  console.log("  PHASE 4: ASYNC QUEUE & WORKER PIPELINE END-TO-END VERIFICATION  ");
  console.log("==================================================================\n");

  const workerDir = path.resolve(__dirname, "../../worker");

  // 1. Spawn BullMQ Worker as an isolated child process
  console.log("[Setup] Spawning BullMQ Consumer Worker process...");
  const workerProcess = spawn("npx", ["tsx", "src/index.ts"], {
    cwd: workerDir,
    stdio: "inherit",
    shell: true,
  });

  // Give worker a moment to connect to Redis
  await new Promise((r) => setTimeout(r, 2000));

  // 2. Start API Server
  console.log("[Setup] Starting Express API Server...");
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start test API server");
  }
  const serverUrl = `http://localhost:${address.port}`;

  let passed = 0;
  let total = 0;

  const assert = (condition: boolean, title: string, details?: string) => {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] ${title}`);
    } else {
      console.error(`[FAIL] ${title}: ${details || "Assertion failed"}`);
      process.exitCode = 1;
    }
  };

  try {
    // 3. Login as standard user (from seed)
    const loginRes = await makeRequest(serverUrl, "POST", "/api/auth/login", {
      email: "user@oj.com",
      password: "user123",
    });
    assert(loginRes.status === 200 && loginRes.body.token, "Authenticate test user");
    const token = loginRes.body.token;

    // 4. Fetch Two Sum problem
    const problemRes = await makeRequest(serverUrl, "GET", "/api/problems/two-sum", undefined, token);
    assert(problemRes.status === 200 && problemRes.body.problem.id, "Fetch target problem (Two Sum)");
    const problemId = problemRes.body.problem.id;

    // -------------------------------------------------------------
    // Scenario A: Correct Submission (Expect: ACCEPTED)
    // -------------------------------------------------------------
    console.log("\n--> A. Dispatching Correct C++ Submission...");
    const correctCode = `
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
    const subRes1 = await makeRequest(
      serverUrl,
      "POST",
      "/api/submissions",
      { problemId, code: correctCode, language: "cpp" },
      token
    );
    assert(
      subRes1.status === 201 && subRes1.body.submission.status === "PENDING",
      "Submission successfully queued with PENDING status"
    );
    const subId1 = subRes1.body.submission.id;

    const pollRes1 = await pollSubmission(serverUrl, subId1, token);
    assert(
      pollRes1.submission.status === "ACCEPTED",
      "Correct code processed by worker and verified as ACCEPTED",
      `Final status: ${pollRes1.submission.status}`
    );
    assert(
      pollRes1.submission.executionTime > 0,
      `Recorded valid execution duration: ${pollRes1.submission.executionTime}ms`
    );

    // -------------------------------------------------------------
    // Scenario B: Wrong Answer Submission (Expect: WRONG_ANSWER)
    // -------------------------------------------------------------
    console.log("\n--> B. Dispatching Wrong Answer Submission...");
    const wrongCode = `
#include <iostream>
using namespace std;
int main() {
    cout << "999 999\\n";
    return 0;
}
`;
    const subRes2 = await makeRequest(
      serverUrl,
      "POST",
      "/api/submissions",
      { problemId, code: wrongCode, language: "cpp" },
      token
    );
    const subId2 = subRes2.body.submission.id;
    const pollRes2 = await pollSubmission(serverUrl, subId2, token);
    assert(
      pollRes2.submission.status === "WRONG_ANSWER" && pollRes2.submission.failedTestCase === 1,
      "Incorrect solution evaluated and flagged as WRONG_ANSWER on testcase 1",
      `Final status: ${pollRes2.submission.status}, failedTestCase: ${pollRes2.submission.failedTestCase}`
    );

    // -------------------------------------------------------------
    // Scenario C: Infinite Loop Submission (Expect: TIME_LIMIT_EXCEEDED)
    // -------------------------------------------------------------
    console.log("\n--> C. Dispatching Infinite Loop Submission...");
    const tleCode = `
#include <iostream>
using namespace std;
int main() {
    while (true) {}
    return 0;
}
`;
    const subRes3 = await makeRequest(
      serverUrl,
      "POST",
      "/api/submissions",
      { problemId, code: tleCode, language: "cpp" },
      token
    );
    const subId3 = subRes3.body.submission.id;
    const pollRes3 = await pollSubmission(serverUrl, subId3, token);
    assert(
      pollRes3.submission.status === "TIME_LIMIT_EXCEEDED",
      "Infinite loop caught by sandbox and marked as TIME_LIMIT_EXCEEDED",
      `Final status: ${pollRes3.submission.status}`
    );

    // -------------------------------------------------------------
    // Scenario D: Compilation Error Submission (Expect: COMPILATION_ERROR)
    // -------------------------------------------------------------
    console.log("\n--> D. Dispatching Compilation Error Submission...");
    const ceCode = `
#include <iostream>
int main() {
    non_existent_syntax_error();
    return 0;
}
`;
    const subRes4 = await makeRequest(
      serverUrl,
      "POST",
      "/api/submissions",
      { problemId, code: ceCode, language: "cpp" },
      token
    );
    const subId4 = subRes4.body.submission.id;
    const pollRes4 = await pollSubmission(serverUrl, subId4, token);
    assert(
      pollRes4.submission.status === "COMPILATION_ERROR" &&
      pollRes4.submission.errorMessage &&
      pollRes4.submission.errorMessage.includes("error"),
      "Compilation error captured with g++ stderr in database",
      `Final status: ${pollRes4.submission.status}`
    );

    // -------------------------------------------------------------
    // Scenario E: Fetch Submission History
    // -------------------------------------------------------------
    console.log("\n--> E. Checking Submission History API...");
    const historyRes = await makeRequest(
      serverUrl,
      "GET",
      `/api/submissions?problemId=${problemId}`,
      undefined,
      token
    );
    assert(
      historyRes.status === 200 && historyRes.body.submissions.length >= 4,
      "Submission history endpoint correctly lists recent submissions"
    );

    console.log("\n==================================================================");
    console.log(`  PHASE 4 E2E QUEUE VERIFICATION COMPLETE: ${passed}/${total} PASSED`);
    console.log("==================================================================\n");
  } finally {
    server.close();
    workerProcess.kill("SIGTERM");
  }
};

runPhase4Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Phase 4 test runner failed:", err);
    process.exit(1);
  });
