import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create an admin user if not exists
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

  // Create a regular user
  const userPassword = await bcrypt.hash("user123", 10);
  await prisma.user.upsert({
    where: { email: "user@oj.com" },
    update: {},
    create: {
      email: "user@oj.com",
      password: userPassword,
      name: "Demo Coder",
      role: "USER",
    },
  });

  // Create standard "Two Sum" problem
  const twoSum = await prisma.problem.upsert({
    where: { slug: "two-sum" },
    update: {},
    create: {
      title: "Two Sum",
      slug: "two-sum",
      description: `### Problem Description

Given an array of integers \`nums\` and an integer \`target\`, return the indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

Output the two indices separated by a space in ascending order.

#### Input Format
- Line 1: An integer \`n\` (number of elements).
- Line 2: \`n\` space-separated integers representing the array \`nums\`.
- Line 3: An integer \`target\`.

#### Output Format
- Two space-separated indices.

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
`,
      difficulty: "EASY",
      timeLimit: 2000,
      memoryLimit: 256,
      templateCode: `#include <iostream>
#include <vector>
#include <unordered_map>

using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    
    vector<int> nums(n);
    for (int i = 0; i < n; i++) {
        cin >> nums[i];
    }
    
    int target;
    cin >> target;
    
    unordered_map<int, int> seen;
    for (int i = 0; i < n; i++) {
        int complement = target - nums[i];
        if (seen.find(complement) != seen.end()) {
            cout << seen[complement] << " " << i << endl;
            return 0;
        }
        seen[nums[i]] = i;
    }
    
    return 0;
}
`,
      testCases: {
        create: [
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
            input: "5\n1 2 3 4 5\n9",
            expectedOutput: "3 4",
            isHidden: true,
          },
          {
            input: "6\n-1 -2 -3 -4 -5 10\n-7",
            expectedOutput: "2 3",
            isHidden: true,
          },
        ],
      },
    },
  });

  console.log(`Seeded: Admin (${admin.email}), Problem: ${twoSum.title} (${twoSum.slug})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

