import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with 10 classic algorithmic challenges...");

  // 1. Ensure Demo Accounts Exist
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@oj.com" },
    update: {},
    create: {
      email: "admin@oj.com",
      password: adminPassword,
      name: "Platform Admin",
      role: "ADMIN",
    },
  });

  const userPassword = await bcrypt.hash("user123", 10);
  const user = await prisma.user.upsert({
    where: { email: "user@oj.com" },
    update: {},
    create: {
      email: "user@oj.com",
      password: userPassword,
      name: "Demo Coder",
      role: "USER",
    },
  });

  // 2. Clear Existing Submissions, Test Cases, and Problems
  console.log("Cleaning up prior submissions, test cases, and problem records...");
  await prisma.submission.deleteMany({});
  await prisma.testCase.deleteMany({});
  await prisma.problem.deleteMany({});

  // 3. Define 10 Classic LeetCode-Style Challenges
  const problems = [
    // -------------------------------------------------------------------------
    // 1. Two Sum (Easy - Arrays, Hash Table)
    // -------------------------------------------------------------------------
    {
      title: "Two Sum",
      slug: "two-sum",
      difficulty: "EASY",
      timeLimit: 2000,
      memoryLimit: 256,
      description: `### Problem Description

Given an array of integers \`nums\` and an integer \`target\`, return the indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

Output the two indices separated by a single space in ascending order.

#### Input Format
- Line 1: An integer \`n\` ($2 \\le n \\le 10^5$), the size of the array.
- Line 2: \`n\` space-separated integers representing the array \`nums\`.
- Line 3: An integer \`target\`.

#### Output Format
- Two space-separated 0-based indices \`i j\` with $i < j$.

#### Constraints
- $2 \\le n \\le 10^5$
- $-10^9 \\le nums[i] \\le 10^9$
- $-10^9 \\le target \\le 10^9$
- Exactly one valid answer exists.

#### Example 1
**Input:**
\`\`\`text
4
2 7 11 15
9
\`\`\`
**Output:**
\`\`\`text
0 1
\`\`\`

#### Example 2
**Input:**
\`\`\`text
3
3 2 4
6
\`\`\`
**Output:**
\`\`\`text
1 2
\`\`\`
`,
      templateCode: `#include <iostream>
#include <vector>
#include <unordered_map>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n;
    if (!(cin >> n)) return 0;

    vector<int> nums(n);
    for (int i = 0; i < n; i++) {
        cin >> nums[i];
    }

    int target;
    cin >> target;

    // TODO: Find two indices i and j such that nums[i] + nums[j] == target
    // and print "i j" (with i < j)

    return 0;
}
`,
      testCases: [
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
        {
          input: "5\n-3 4 3 90 -5\n-8",
          expectedOutput: "0 4",
          isHidden: true,
        },
        {
          input: "6\n1 5 10 20 30 40\n41",
          expectedOutput: "0 5",
          isHidden: true,
        },
      ],
    },

    // -------------------------------------------------------------------------
    // 2. Valid Parentheses (Easy - Strings, Stack)
    // -------------------------------------------------------------------------
    {
      title: "Valid Parentheses",
      slug: "valid-parentheses",
      difficulty: "EASY",
      timeLimit: 2000,
      memoryLimit: 256,
      description: `### Problem Description

Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

Print \`true\` if the string is valid, or \`false\` otherwise.

#### Input Format
- Line 1: A single string \`s\` consisting of bracket characters.

#### Output Format
- Print \`true\` or \`false\`.

#### Constraints
- $1 \\le |s| \\le 10^5$
- \`s\` consists of parentheses only: \`'()[]{}'\`.

#### Example 1
**Input:**
\`\`\`text
()[]{}
\`\`\`
**Output:**
\`\`\`text
true
\`\`\`

#### Example 2
**Input:**
\`\`\`text
(]
\`\`\`
**Output:**
\`\`\`text
false
\`\`\`
`,
      templateCode: `#include <iostream>
#include <string>
#include <stack>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    string s;
    if (!(cin >> s)) return 0;

    // TODO: Determine if brackets are properly matched.
    // Print "true" or "false".

    return 0;
}
`,
      testCases: [
        {
          input: "()[]{}",
          expectedOutput: "true",
          isHidden: false,
        },
        {
          input: "(]",
          expectedOutput: "false",
          isHidden: false,
        },
        {
          input: "{[()]}",
          expectedOutput: "true",
          isHidden: true,
        },
        {
          input: "[",
          expectedOutput: "false",
          isHidden: true,
        },
        {
          input: "])",
          expectedOutput: "false",
          isHidden: true,
        },
      ],
    },

    // -------------------------------------------------------------------------
    // 3. Maximum Subarray (Easy - Arrays, Dynamic Programming / Kadane's)
    // -------------------------------------------------------------------------
    {
      title: "Maximum Subarray",
      slug: "maximum-subarray",
      difficulty: "EASY",
      timeLimit: 2000,
      memoryLimit: 256,
      description: `### Problem Description

Given an integer array \`nums\`, find the contiguous subarray (containing at least one number) which has the largest sum and print its sum.

A **subarray** is a contiguous non-empty sequence of elements within an array.

#### Input Format
- Line 1: An integer \`n\` ($1 \\le n \\le 10^5$), representing the size of the array.
- Line 2: \`n\` space-separated integers representing \`nums\`.

#### Output Format
- Print a single integer representing the maximum subarray sum.

#### Constraints
- $1 \\le n \\le 10^5$
- $-10^4 \\le nums[i] \\le 10^4$

#### Example 1
**Input:**
\`\`\`text
9
-2 1 -3 4 -1 2 1 -5 4
\`\`\`
**Output:**
\`\`\`text
6
\`\`\`
*Explanation: The subarray \`[4, -1, 2, 1]\` has the largest sum = 6.*

#### Example 2
**Input:**
\`\`\`text
1
1
\`\`\`
**Output:**
\`\`\`text
1
\`\`\`
`,
      templateCode: `#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n;
    if (!(cin >> n)) return 0;

    vector<int> nums(n);
    for (int i = 0; i < n; i++) {
        cin >> nums[i];
    }

    // TODO: Implement Kadane's algorithm to compute the maximum subarray sum.
    // Print the maximum sum.

    return 0;
}
`,
      testCases: [
        {
          input: "9\n-2 1 -3 4 -1 2 1 -5 4",
          expectedOutput: "6",
          isHidden: false,
        },
        {
          input: "1\n1",
          expectedOutput: "1",
          isHidden: false,
        },
        {
          input: "5\n-5 -4 -1 -2 -8",
          expectedOutput: "-1",
          isHidden: true,
        },
        {
          input: "5\n5 4 -1 7 8",
          expectedOutput: "23",
          isHidden: true,
        },
        {
          input: "4\n-2 0 -1 0",
          expectedOutput: "0",
          isHidden: true,
        },
      ],
    },

    // -------------------------------------------------------------------------
    // 4. Merge Intervals (Medium - Arrays, Sorting, Two Pointers)
    // -------------------------------------------------------------------------
    {
      title: "Merge Intervals",
      slug: "merge-intervals",
      difficulty: "MEDIUM",
      timeLimit: 2000,
      memoryLimit: 256,
      description: `### Problem Description

Given an array of \`intervals\` where \`intervals[i] = [start_i, end_i]\`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.

#### Input Format
- Line 1: An integer \`n\` ($1 \\le n \\le 10^5$), the number of intervals.
- Next \`n\` lines: Two space-separated integers \`start_i end_i\` representing each interval.

#### Output Format
- Print each merged interval sorted in ascending order of \`start\`, with \`start\` and \`end\` separated by a space on a new line.

#### Constraints
- $1 \\le n \\le 10^5$
- $0 \\le start_i \\le end_i \\le 10^5$

#### Example 1
**Input:**
\`\`\`text
4
1 3
2 6
8 10
15 18
\`\`\`
**Output:**
\`\`\`text
1 6
8 10
15 18
\`\`\`

#### Example 2
**Input:**
\`\`\`text
2
1 4
4 5
\`\`\`
**Output:**
\`\`\`text
1 5
\`\`\`
`,
      templateCode: `#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

struct Interval {
    int start;
    int end;
};

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n;
    if (!(cin >> n)) return 0;

    vector<Interval> intervals(n);
    for (int i = 0; i < n; i++) {
        cin >> intervals[i].start >> intervals[i].end;
    }

    // TODO: Sort intervals and merge overlapping intervals.
    // Print each merged interval's start and end on a new line.

    return 0;
}
`,
      testCases: [
        {
          input: "4\n1 3\n2 6\n8 10\n15 18",
          expectedOutput: "1 6\n8 10\n15 18",
          isHidden: false,
        },
        {
          input: "2\n1 4\n4 5",
          expectedOutput: "1 5",
          isHidden: false,
        },
        {
          input: "1\n2 5",
          expectedOutput: "2 5",
          isHidden: true,
        },
        {
          input: "3\n1 10\n2 3\n4 8",
          expectedOutput: "1 10",
          isHidden: true,
        },
        {
          input: "4\n2 3\n4 5\n6 7\n1 10",
          expectedOutput: "1 10",
          isHidden: true,
        },
      ],
    },

    // -------------------------------------------------------------------------
    // 5. Number of Islands (Medium - Graphs, BFS/DFS, Matrix)
    // -------------------------------------------------------------------------
    {
      title: "Number of Islands",
      slug: "number-of-islands",
      difficulty: "MEDIUM",
      timeLimit: 2000,
      memoryLimit: 256,
      description: `### Problem Description

Given an \`m x n\` 2D binary grid \`grid\` which represents a map of \`'1'\`s (land) and \`'0'\`s (water), return the number of islands.

An **island** is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.

#### Input Format
- Line 1: Two space-separated integers \`m\` and \`n\` ($1 \\le m, n \\le 300$).
- Next \`m\` lines: \`n\` space-separated characters (\`'0'\` or \`'1'\`).

#### Output Format
- Print a single integer representing the total number of islands.

#### Constraints
- $1 \\le m, n \\le 300$
- \`grid[i][j]\` is \`'0'\` or \`'1'\`.

#### Example 1
**Input:**
\`\`\`text
4 5
1 1 1 1 0
1 1 0 1 0
1 1 0 0 0
0 0 0 0 0
\`\`\`
**Output:**
\`\`\`text
1
\`\`\`

#### Example 2
**Input:**
\`\`\`text
4 5
1 1 0 0 0
1 1 0 0 0
0 0 1 0 0
0 0 0 1 1
\`\`\`
**Output:**
\`\`\`text
3
\`\`\`
`,
      templateCode: `#include <iostream>
#include <vector>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int m, n;
    if (!(cin >> m >> n)) return 0;

    vector<vector<char>> grid(m, vector<char>(n));
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            cin >> grid[i][j];
        }
    }

    // TODO: Count connected components of '1's using DFS or BFS.
    // Print the count of islands.

    return 0;
}
`,
      testCases: [
        {
          input: "4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0",
          expectedOutput: "1",
          isHidden: false,
        },
        {
          input: "4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1",
          expectedOutput: "3",
          isHidden: false,
        },
        {
          input: "2 2\n0 0\n0 0",
          expectedOutput: "0",
          isHidden: true,
        },
        {
          input: "1 1\n1",
          expectedOutput: "1",
          isHidden: true,
        },
        {
          input: "3 3\n1 0 1\n0 1 0\n1 0 1",
          expectedOutput: "5",
          isHidden: true,
        },
      ],
    },

    // -------------------------------------------------------------------------
    // 6. Longest Common Subsequence (Medium - Dynamic Programming, Strings)
    // -------------------------------------------------------------------------
    {
      title: "Longest Common Subsequence",
      slug: "longest-common-subsequence",
      difficulty: "MEDIUM",
      timeLimit: 2000,
      memoryLimit: 256,
      description: `### Problem Description

Given two strings \`text1\` and \`text2\`, return the length of their **longest common subsequence**. If there is no common subsequence, return \`0\`.

A **subsequence** of a string is a new string generated from the original string with some characters (can be none) deleted without changing the relative order of the remaining characters.
- For example, \`"ace"\` is a subsequence of \`"abcde"\`.

A **common subsequence** of two strings is a subsequence that is common to both strings.

#### Input Format
- Line 1: String \`text1\`.
- Line 2: String \`text2\`.

#### Output Format
- Print an integer denoting the length of the longest common subsequence.

#### Constraints
- $1 \\le |text1|, |text2| \\le 1000$
- \`text1\` and \`text2\` consist of only lowercase English characters.

#### Example 1
**Input:**
\`\`\`text
abcde
ace
\`\`\`
**Output:**
\`\`\`text
3
\`\`\`
*Explanation: The longest common subsequence is \`"ace"\` and its length is 3.*

#### Example 2
**Input:**
\`\`\`text
abc
abc
\`\`\`
**Output:**
\`\`\`text
3
\`\`\`
`,
      templateCode: `#include <iostream>
#include <string>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    string text1, text2;
    if (!(cin >> text1 >> text2)) return 0;

    // TODO: Compute the length of the longest common subsequence using 2D DP.
    // Print the integer result.

    return 0;
}
`,
      testCases: [
        {
          input: "abcde\nace",
          expectedOutput: "3",
          isHidden: false,
        },
        {
          input: "abc\nabc",
          expectedOutput: "3",
          isHidden: false,
        },
        {
          input: "abc\ndef",
          expectedOutput: "0",
          isHidden: true,
        },
        {
          input: "oxcp\nxzp",
          expectedOutput: "2",
          isHidden: true,
        },
        {
          input: "a\na",
          expectedOutput: "1",
          isHidden: true,
        },
      ],
    },

    // -------------------------------------------------------------------------
    // 7. LRU Cache (Medium - Data Structures, Pointers, Doubly Linked List)
    // -------------------------------------------------------------------------
    {
      title: "LRU Cache",
      slug: "lru-cache",
      difficulty: "MEDIUM",
      timeLimit: 2000,
      memoryLimit: 256,
      description: `### Problem Description

Design a data structure that follows the constraints of a **Least Recently Used (LRU) cache**.

Implement the following operations:
- \`put key value\`: Insert or update the value of the \`key\`. If the number of keys exceeds the \`capacity\`, evict the least recently used key.
- \`get key\`: Return the value of the \`key\` if it exists, otherwise print \`-1\`.

Both \`get\` and \`put\` must run in $O(1)$ average time complexity.

#### Input Format
- Line 1: Two space-separated integers \`capacity\` and \`q\` ($1 \\le capacity \\le 3000, 1 \\le q \\le 10^5$).
- Next \`q\` lines: Either \`put key value\` or \`get key\`.

#### Output Format
- For each \`get\` operation, print the retrieved value (or \`-1\` if not found) on a new line.

#### Constraints
- $1 \\le capacity \\le 3000$
- $1 \\le q \\le 10^5$
- $0 \\le key \\le 10^4$
- $0 \\le value \\le 10^5$

#### Example 1
**Input:**
\`\`\`text
2 8
put 1 1
put 2 2
get 1
put 3 3
get 2
put 4 4
get 1
get 3
\`\`\`
**Output:**
\`\`\`text
1
-1
-1
3
\`\`\`
`,
      templateCode: `#include <iostream>
#include <string>
#include <unordered_map>
#include <list>

using namespace std;

class LRUCache {
    int cap;
    list<pair<int, int>> dll; // {key, value}
    unordered_map<int, list<pair<int, int>>::iterator> cache;

public:
    LRUCache(int capacity) : cap(capacity) {}

    int get(int key) {
        // TODO: Return value if found and move node to front; else return -1
        return -1;
    }

    void put(int key, int value) {
        // TODO: Insert or update key-value pair and handle capacity eviction
    }
};

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int capacity, q;
    if (!(cin >> capacity >> q)) return 0;

    LRUCache lru(capacity);
    while (q--) {
        string op;
        cin >> op;
        if (op == "put") {
            int k, v;
            cin >> k >> v;
            lru.put(k, v);
        } else if (op == "get") {
            int k;
            cin >> k;
            cout << lru.get(k) << "\\n";
        }
    }

    return 0;
}
`,
      testCases: [
        {
          input: "2 8\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2\nput 4 4\nget 1\nget 3",
          expectedOutput: "1\n-1\n-1\n3",
          isHidden: false,
        },
        {
          input: "1 4\nput 10 100\nget 10\nput 20 200\nget 10",
          expectedOutput: "100\n-1",
          isHidden: false,
        },
        {
          input: "2 4\nput 1 10\nput 1 20\nget 1\nget 2",
          expectedOutput: "20\n-1",
          isHidden: true,
        },
        {
          input: "2 7\nput 1 1\nput 2 2\nget 1\nget 1\nput 3 3\nget 2\nget 3",
          expectedOutput: "1\n1\n-1\n3",
          isHidden: true,
        },
      ],
    },

    // -------------------------------------------------------------------------
    // 8. Trapping Rain Water (Hard - Two Pointers, Stack, Arrays)
    // -------------------------------------------------------------------------
    {
      title: "Trapping Rain Water",
      slug: "trapping-rain-water",
      difficulty: "HARD",
      timeLimit: 2000,
      memoryLimit: 256,
      description: `### Problem Description

Given \`n\` non-negative integers representing an elevation map where the width of each bar is \`1\`, compute how much water it can trap after raining.

#### Input Format
- Line 1: An integer \`n\` ($0 \\le n \\le 10^5$), representing the number of elevation bars.
- Line 2: \`n\` space-separated non-negative integers representing elevation \`height\`.

#### Output Format
- Print a single integer representing the total amount of trapped water.

#### Constraints
- $0 \\le n \\le 10^5$
- $0 \\le height[i] \\le 10^5$

#### Example 1
**Input:**
\`\`\`text
12
0 1 0 2 1 0 1 3 2 1 2 1
\`\`\`
**Output:**
\`\`\`text
6
\`\`\`
*Explanation: The elevation map is \`[0,1,0,2,1,0,1,3,2,1,2,1]\`. In this case, 6 units of rain water are trapped.*

#### Example 2
**Input:**
\`\`\`text
6
4 2 0 3 2 5
\`\`\`
**Output:**
\`\`\`text
9
\`\`\`
`,
      templateCode: `#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n;
    if (!(cin >> n)) return 0;
    if (n == 0) {
        cout << 0 << "\\n";
        return 0;
    }

    vector<int> height(n);
    for (int i = 0; i < n; i++) {
        cin >> height[i];
    }

    // TODO: Calculate and print trapped rainwater using Two Pointers or Prefix/Suffix max.

    return 0;
}
`,
      testCases: [
        {
          input: "12\n0 1 0 2 1 0 1 3 2 1 2 1",
          expectedOutput: "6",
          isHidden: false,
        },
        {
          input: "6\n4 2 0 3 2 5",
          expectedOutput: "9",
          isHidden: false,
        },
        {
          input: "4\n3 3 3 3",
          expectedOutput: "0",
          isHidden: true,
        },
        {
          input: "5\n1 2 3 4 5",
          expectedOutput: "0",
          isHidden: true,
        },
        {
          input: "5\n5 1 0 1 5",
          expectedOutput: "13",
          isHidden: true,
        },
      ],
    },

    // -------------------------------------------------------------------------
    // 9. Edit Distance (Hard - Dynamic Programming, Strings)
    // -------------------------------------------------------------------------
    {
      title: "Edit Distance",
      slug: "edit-distance",
      difficulty: "HARD",
      timeLimit: 2000,
      memoryLimit: 256,
      description: `### Problem Description

Given two strings \`word1\` and \`word2\`, return the minimum number of operations required to convert \`word1\` to \`word2\`.

You have the following three operations permitted on a word:
1. **Insert** a character
2. **Delete** a character
3. **Replace** a character

#### Input Format
- Line 1: String \`word1\` (or \`-\` to denote an empty string).
- Line 2: String \`word2\` (or \`-\` to denote an empty string).

#### Output Format
- Print a single integer representing the Levenshtein edit distance.

#### Constraints
- $0 \\le |word1|, |word2| \\le 500$
- \`word1\` and \`word2\` consist of lowercase English letters (or \`-\` for empty).

#### Example 1
**Input:**
\`\`\`text
horse
ros
\`\`\`
**Output:**
\`\`\`text
3
\`\`\`
*Explanation:*
1. horse -> rorse (replace 'h' with 'r')
2. rorse -> rose (remove 'r')
3. rose -> ros (remove 'e')

#### Example 2
**Input:**
\`\`\`text
intention
execution
\`\`\`
**Output:**
\`\`\`text
5
\`\`\`
`,
      templateCode: `#include <iostream>
#include <string>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    string word1, word2;
    if (!(cin >> word1 >> word2)) return 0;

    if (word1 == "-") word1 = "";
    if (word2 == "-") word2 = "";

    // TODO: Compute and print the minimum edit distance using Dynamic Programming.

    return 0;
}
`,
      testCases: [
        {
          input: "horse\nros",
          expectedOutput: "3",
          isHidden: false,
        },
        {
          input: "intention\nexecution",
          expectedOutput: "5",
          isHidden: false,
        },
        {
          input: "algorithm\nalgorithm",
          expectedOutput: "0",
          isHidden: true,
        },
        {
          input: "-\nabc",
          expectedOutput: "3",
          isHidden: true,
        },
        {
          input: "a\nb",
          expectedOutput: "1",
          isHidden: true,
        },
      ],
    },

    // -------------------------------------------------------------------------
    // 10. N-Queens (Hard - Backtracking, Recursion)
    // -------------------------------------------------------------------------
    {
      title: "N-Queens",
      slug: "n-queens",
      difficulty: "HARD",
      timeLimit: 2000,
      memoryLimit: 256,
      description: `### Problem Description

The **n-queens** puzzle is the problem of placing \`n\` queens on an \`n x n\` chessboard such that no two queens attack each other.

Given an integer \`n\`, return the total number of distinct solutions to the **n-queens puzzle**.

Two queens attack each other if they are placed on the same row, column, or diagonal.

#### Input Format
- Line 1: A single integer \`n\` ($1 \\le n \\le 12$).

#### Output Format
- Print a single integer denoting the number of distinct valid queen placements.

#### Constraints
- $1 \\le n \\le 12$

#### Example 1
**Input:**
\`\`\`text
4
\`\`\`
**Output:**
\`\`\`text
2
\`\`\`
*Explanation: There are two distinct solutions to the 4-queens puzzle.*

#### Example 2
**Input:**
\`\`\`text
1
\`\`\`
**Output:**
\`\`\`text
1
\`\`\`
`,
      templateCode: `#include <iostream>
#include <vector>

using namespace std;

int totalNQueens(int n) {
    // TODO: Implement backtracking to count distinct N-Queens placements
    return 0;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n;
    if (!(cin >> n)) return 0;

    cout << totalNQueens(n) << "\\n";
    return 0;
}
`,
      testCases: [
        {
          input: "4",
          expectedOutput: "2",
          isHidden: false,
        },
        {
          input: "1",
          expectedOutput: "1",
          isHidden: false,
        },
        {
          input: "2",
          expectedOutput: "0",
          isHidden: true,
        },
        {
          input: "3",
          expectedOutput: "0",
          isHidden: true,
        },
        {
          input: "8",
          expectedOutput: "92",
          isHidden: true,
        },
        {
          input: "10",
          expectedOutput: "724",
          isHidden: true,
        },
      ],
    },
  ];

  for (const prob of problems) {
    const { testCases, ...problemData } = prob;

    const created = await prisma.problem.create({
      data: {
        ...problemData,
        testCases: {
          create: testCases,
        },
      },
    });

    console.log(
      `[Seeded] [${created.difficulty}] ${created.title} (${created.slug}) with ${testCases.length} test cases.`
    );
  }

  const problemCount = await prisma.problem.count();
  const testCaseCount = await prisma.testCase.count();
  console.log(
    `\nSeeding complete! Total Problems: ${problemCount}, Total Test Cases: ${testCaseCount}.`
  );
  console.log(`Demo Users: Admin (${admin.email}), User (${user.email})`);
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
