process.env.NODE_ENV = "test";
import http from "http";
import app from "./index";

interface TestResponse {
  status: number;
  body: any;
}

const makeRequest = (
  serverUrl: string,
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<TestResponse> => {
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

const runTests = async () => {
  console.log("==========================================");
  console.log("   PHASE 2 INTEGRATION TEST SUITE");
  console.log("==========================================\n");

  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start test server");
  }

  const serverUrl = `http://localhost:${address.port}`;
  let passedTests = 0;
  let totalTests = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] ${testName}`);
    } else {
      console.error(`[FAIL] ${testName}: ${detail || "Assertion failed"}`);
      process.exitCode = 1;
    }
  };

  try {
    // 1. Health check
    const healthRes = await makeRequest(serverUrl, "GET", "/health");
    assert(healthRes.status === 200 && healthRes.body.status === "healthy", "Server health check");

    // 2. Register Regular User
    const uniqueId = Date.now();
    const userPayload = {
      name: "LeetCode Coder",
      email: `coder_${uniqueId}@example.com`,
      password: "password123",
      role: "USER",
    };
    const regUserRes = await makeRequest(serverUrl, "POST", "/api/auth/register", userPayload);
    assert(regUserRes.status === 201 && regUserRes.body.token, "Register regular user");
    const userToken = regUserRes.body.token;

    // 3. Register Admin User
    const adminPayload = {
      name: "OJ Admin",
      email: `admin_${uniqueId}@example.com`,
      password: "adminpassword123",
      role: "ADMIN",
    };
    const regAdminRes = await makeRequest(serverUrl, "POST", "/api/auth/register", adminPayload);
    assert(regAdminRes.status === 201 && regAdminRes.body.token, "Register admin user");
    const adminToken = regAdminRes.body.token;

    // 4. Duplicate Registration rejection
    const dupRes = await makeRequest(serverUrl, "POST", "/api/auth/register", userPayload);
    assert(dupRes.status === 409, "Reject duplicate email registration (409 Conflict)");

    // 5. Login
    const loginRes = await makeRequest(serverUrl, "POST", "/api/auth/login", {
      email: userPayload.email,
      password: userPayload.password,
    });
    assert(loginRes.status === 200 && loginRes.body.token, "Login with valid credentials");

    // 6. Login with invalid password
    const badLoginRes = await makeRequest(serverUrl, "POST", "/api/auth/login", {
      email: userPayload.email,
      password: "wrongPassword",
    });
    assert(badLoginRes.status === 401, "Reject invalid login credentials (401)");

    // 7. Verify /api/auth/me
    const meRes = await makeRequest(serverUrl, "GET", "/api/auth/me", undefined, userToken);
    assert(meRes.status === 200 && meRes.body.user.email === userPayload.email, "Verify /api/auth/me JWT auth");

    // 8. Regular user attempting to create a problem (RBAC check)
    const problemPayload = {
      title: `Two Sum ${uniqueId}`,
      description: "Given an array of integers nums and an integer target, return indices of the two numbers.",
      difficulty: "EASY",
      timeLimit: 1500,
      memoryLimit: 256,
      templateCode: "#include <iostream>\nusing namespace std;\nint main() { return 0; }",
      testCases: [
        {
          input: "4\n2 7 11 15\n9",
          expectedOutput: "0 1",
          isHidden: false, // Sample public testcase
        },
        {
          input: "3\n3 2 4\n6",
          expectedOutput: "1 2",
          isHidden: false, // Sample public testcase
        },
        {
          input: "2\n3 3\n6",
          expectedOutput: "0 1",
          isHidden: true, // Hidden grading testcase
        },
        {
          input: "5\n1 2 3 4 5\n9",
          expectedOutput: "3 4",
          isHidden: true, // Hidden grading testcase
        },
      ],
    };

    const unauthProblemRes = await makeRequest(serverUrl, "POST", "/api/problems", problemPayload, userToken);
    assert(unauthProblemRes.status === 403, "Non-admin blocked from creating problems (403 Forbidden)");

    // 9. Admin creating problem
    const adminProblemRes = await makeRequest(serverUrl, "POST", "/api/problems", problemPayload, adminToken);
    assert(adminProblemRes.status === 201 && adminProblemRes.body.problem.id, "Admin creates problem successfully");
    const createdProblem = adminProblemRes.body.problem;

    // 10. Public / Regular user GET /api/problems/:slug (CRITICAL TESTCASE FILTERING CHECK)
    const publicProblemRes = await makeRequest(serverUrl, "GET", `/api/problems/${createdProblem.slug}`, undefined, userToken);
    const publicTestCases = publicProblemRes.body.problem.testCases;
    const hasAnyHidden = publicTestCases.some((tc: any) => tc.isHidden === true);
    assert(
      publicProblemRes.status === 200 &&
      publicTestCases.length === 2 &&
      !hasAnyHidden,
      "Public endpoint strictly filters out hidden test cases (only sample cases returned)"
    );

    // 11. Admin GET /api/problems/:slug (Must see all test cases, including hidden)
    const adminViewRes = await makeRequest(serverUrl, "GET", `/api/problems/${createdProblem.slug}`, undefined, adminToken);
    const adminTestCases = adminViewRes.body.problem.testCases;
    assert(
      adminViewRes.status === 200 &&
      adminTestCases.length === 4,
      "Admin endpoint includes all test cases (both public and hidden)"
    );

    // 12. Problem List GET /api/problems
    const listRes = await makeRequest(serverUrl, "GET", "/api/problems");
    const foundInList = listRes.body.problems.find((p: any) => p.id === createdProblem.id);
    assert(
      listRes.status === 200 &&
      foundInList &&
      foundInList._count.testCases === 4,
      "List problems correctly counts testcases without leaking raw data"
    );

    // 13. Admin update problem
    const updateRes = await makeRequest(
      serverUrl,
      "PUT",
      `/api/problems/${createdProblem.id}`,
      { difficulty: "MEDIUM", timeLimit: 2500 },
      adminToken
    );
    assert(
      updateRes.status === 200 &&
      updateRes.body.problem.difficulty === "MEDIUM" &&
      updateRes.body.problem.timeLimit === 2500,
      "Admin updates problem metadata successfully"
    );

    // 14. Admin delete problem
    const deleteRes = await makeRequest(
      serverUrl,
      "DELETE",
      `/api/problems/${createdProblem.id}`,
      undefined,
      adminToken
    );
    assert(deleteRes.status === 200, "Admin deletes problem successfully (Cascade cleanup)");

    // 15. Verify problem is gone
    const verifyDeleted = await makeRequest(serverUrl, "GET", `/api/problems/${createdProblem.slug}`);
    assert(verifyDeleted.status === 404, "Deleted problem returns 404");

    console.log("\n==========================================");
    console.log(`   TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
    console.log("==========================================\n");
  } finally {
    server.close();
  }
};

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
