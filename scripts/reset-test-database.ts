import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString || !new URL(connectionString).pathname.endsWith("_test")) throw new Error("Only an explicitly configured _test database can be reset.");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
try {
  await db.$transaction([
    db.dailyQuestion.deleteMany(), db.questionVote.deleteMany(), db.userProgress.deleteMany(),
    db.user.deleteMany(), db.question.deleteMany(),
  ]);
  console.log("Reset disposable test database.");
} finally { await db.$disconnect(); }
