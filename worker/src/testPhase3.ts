import { DockerSandboxExecutor } from "./sandbox/executor";
import { Verdict, TestCase, SandboxConfig } from "./sandbox/types";

const runTests = async () => {
  console.log("==================================================================");
  console.log("    PHASE 3: ISOLATED DOCKER SANDBOX ENGINE ATTACK VERIFICATION   ");
  console.log("==================================================================\n");

  const executor = new DockerSandboxExecutor();
  let passed = 0;
  let total = 0;

  const assert = (condition: boolean, title: string, details?: string) => {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] ${title}`);
    } else {
      console.error(`[FAIL] ${title}: ${details || "Condition not met"}`);
      process.exitCode = 1;
    }
  };

  const sampleTestCases: TestCase[] = [
    {
      input: "4\n2 7 11 15\n9",
      expectedOutput: "0 1",
      isHidden: false,
    },
    {
      input: "3\n3 2 4\n6",
      expectedOutput: "1 2",
      isHidden: false,
    },
    {
      input: "2\n3 3\n6",
      expectedOutput: "0 1",
      isHidden: true,
    },
  ];

  const standardConfig: SandboxConfig = {
    timeLimitMs: 1500,
    memoryLimitMb: 128,
    cpus: "1.0",
    pidsLimit: 64,
  };

  // -------------------------------------------------------------
  // Test 1: Correct C++ Submission (ACCEPTED)
  // -------------------------------------------------------------
  console.log("\n--> 1. Testing Correct C++ Code (Expect: ACCEPTED)...");
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
  const result1 = await executor.runSubmission(correctCode, sampleTestCases, standardConfig);
  assert(
    result1.verdict === Verdict.ACCEPTED && result1.testCaseResults.length === 3,
    "Correct submission gives ACCEPTED on all testcases",
    `Got verdict: ${result1.verdict}`
  );

  // -------------------------------------------------------------
  // Test 2: Wrong Answer Submission (WRONG_ANSWER)
  // -------------------------------------------------------------
  console.log("\n--> 2. Testing Wrong Answer C++ Code (Expect: WRONG_ANSWER)...");
  const wrongCode = `
#include <iostream>
using namespace std;
int main() {
    cout << "999 999\\n";
    return 0;
}
`;
  const result2 = await executor.runSubmission(wrongCode, sampleTestCases, standardConfig);
  assert(
    result2.verdict === Verdict.WRONG_ANSWER && result2.failedTestCaseIndex === 1,
    "Incorrect logic triggers WRONG_ANSWER with fail-fast",
    `Got verdict: ${result2.verdict}, failed index: ${result2.failedTestCaseIndex}`
  );

  // -------------------------------------------------------------
  // Test 3: Infinite Loop Attack (TIME_LIMIT_EXCEEDED)
  // -------------------------------------------------------------
  console.log("\n--> 3. Testing Infinite Loop Attack (Expect: TIME_LIMIT_EXCEEDED)...");
  const infiniteLoopCode = `
#include <iostream>
using namespace std;
int main() {
    volatile int x = 0;
    while (true) {
        x++;
    }
    return 0;
}
`;
  const tightTimeoutConfig: SandboxConfig = {
    timeLimitMs: 1000,
    memoryLimitMb: 128,
    cpus: "1.0",
    pidsLimit: 64,
  };
  const startTle = Date.now();
  const result3 = await executor.runSubmission(infiniteLoopCode, sampleTestCases, tightTimeoutConfig);
  const elapsedTle = Date.now() - startTle;
  assert(
    result3.verdict === Verdict.TIME_LIMIT_EXCEEDED,
    "Infinite loop caught and killed with TIME_LIMIT_EXCEEDED",
    `Got verdict: ${result3.verdict}, elapsed wall time: ${elapsedTle}ms`
  );

  // -------------------------------------------------------------
  // Test 4: Memory Hog / Allocation Bomb Attack (MEMORY_LIMIT_EXCEEDED)
  // -------------------------------------------------------------
  console.log("\n--> 4. Testing Memory Bomb (Expect: MEMORY_LIMIT_EXCEEDED)...");
  const memoryBombCode = `
#include <iostream>
using namespace std;
int main() {
    // Actively writing to 400MB across pages in a 64MB cgroup container
    size_t bytes = 400ULL * 1024 * 1024;
    volatile char* p = new char[bytes];
    for (size_t i = 0; i < bytes; i += 4096) {
        p[i] = 1;
    }
    cout << (int)p[0] << endl;
    return 0;
}
`;
  const tightMemoryConfig: SandboxConfig = {
    timeLimitMs: 3000,
    memoryLimitMb: 64,
    cpus: "1.0",
    pidsLimit: 64,
  };
  const result4 = await executor.runSubmission(memoryBombCode, sampleTestCases, tightMemoryConfig);
  assert(
    result4.verdict === Verdict.MEMORY_LIMIT_EXCEEDED,
    "Memory exhaustion triggers MEMORY_LIMIT_EXCEEDED via cgroup OOM defense",
    `Got verdict: ${result4.verdict}`
  );

  // -------------------------------------------------------------
  // Test 5: Fork Bomb Attack (Safe containment via --pids-limit 64)
  // -------------------------------------------------------------
  console.log("\n--> 5. Testing Fork Bomb Attack (Expect: Host safe, Verdict: TLE or RE)...");
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
  const forkBombConfig: SandboxConfig = {
    timeLimitMs: 1500,
    memoryLimitMb: 128,
    cpus: "1.0",
    pidsLimit: 64,
  };
  const startFb = Date.now();
  const result5 = await executor.runSubmission(forkBombCode, sampleTestCases, forkBombConfig);
  const elapsedFb = Date.now() - startFb;
  assert(
    (result5.verdict === Verdict.TIME_LIMIT_EXCEEDED || result5.verdict === Verdict.RUNTIME_ERROR),
    "Fork bomb safely contained by --pids-limit 64 and killed without host degradation",
    `Got verdict: ${result5.verdict}, elapsed wall time: ${elapsedFb}ms`
  );

  // -------------------------------------------------------------
  // Bonus Test: Compilation Error
  // -------------------------------------------------------------
  console.log("\n--> 6. Bonus: Testing Compilation Error...");
  const invalidCode = `
#include <iostream>
int main() {
    syntax_error_here!
    return 0;
}
`;
  const result6 = await executor.runSubmission(invalidCode, sampleTestCases, standardConfig);
  assert(
    result6.verdict === Verdict.COMPILATION_ERROR && !!result6.errorMessage,
    "Syntax error returns COMPILATION_ERROR with gcc stderr output",
    `Got verdict: ${result6.verdict}`
  );

  console.log("\n==================================================================");
  console.log(`    PHASE 3 VERIFICATION COMPLETE: ${passed}/${total} TESTS PASSED`);
  console.log("==================================================================\n");
};

runTests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
