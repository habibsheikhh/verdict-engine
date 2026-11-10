import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

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

  // 2. Clear Existing Records
  console.log("Cleaning up prior submissions, test cases, and problem records...");

  await prisma.submission.deleteMany({});
  await prisma.testCase.deleteMany({});
  await prisma.problem.deleteMany({});

  // 3. Define Problems
  const problems = [
    // IMPORTANT:
    // Paste your original 10 problem objects here.
    // Keep all descriptions, templateCode and testCases unchanged.
    //
    // For every problem, change:
    // difficulty: "EASY" as const
    // to:
    // difficulty: "EASY"
    //
    // Repeat for MEDIUM and HARD.
  ];

  // 4. Seed Problems
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

  // 5. Display Results
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