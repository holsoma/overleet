import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { syncQuestions } from "../lib/sync";
import { saveProgress, saveVote, importGuestProgress } from "../lib/progress";
import { getDailyQuestion } from "../lib/daily";
import { bank, question } from "./fixtures";

const connectionString = process.env.TEST_DATABASE_URL;
const integration = connectionString ? describe : describe.skip;
integration("PostgreSQL integration", () => {
  let db: PrismaClient;
  let firstUser: string;
  let secondUser: string;
  beforeAll(async () => {
    if (!connectionString || !new URL(connectionString).pathname.endsWith("_test")) throw new Error("Integration tests require TEST_DATABASE_URL pointing to a database whose name ends in _test.");
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    await db.$connect();
  });
  beforeEach(async () => {
    await db.dailyQuestion.deleteMany();
    await db.questionVote.deleteMany();
    await db.userProgress.deleteMany();
    await db.user.deleteMany();
    await db.question.deleteMany();
    firstUser = (await db.user.create({ data: { githubId: "test-one" } })).id;
    secondUser = (await db.user.create({ data: { githubId: "test-two" } })).id;
    await syncQuestions(db, bank(question("first"), question("second")));
  });
  afterAll(async () => { if (db) await db.$disconnect(); });

  it("syncs once, skips unchanged rows and preserves runtime data", async () => {
    const original = await db.question.findUniqueOrThrow({ where: { id: "first" } });
    await saveProgress(db, firstUser, "first", "completed");
    await saveVote(db, firstUser, "first", true);
    const daily = await getDailyQuestion(db, new Date("2026-10-15T12:00:00Z"));
    expect(await syncQuestions(db, bank(question("first"), question("second")))).toEqual({ created: 0, updated: 0, unchanged: 2 });
    expect((await db.question.findUniqueOrThrow({ where: { id: "first" } })).updatedAt).toEqual(original.updatedAt);
    const changed = { ...question("first"), title: "Corrected title", active: false };
    expect((await syncQuestions(db, bank(changed, question("second")))).updated).toBe(1);
    expect(await db.questionVote.count()).toBe(1);
    expect((await db.userProgress.findFirstOrThrow()).status).toBe("completed");
    expect(await getDailyQuestion(db, new Date("2026-10-15T22:00:00Z"))).toBe(daily);
    await expect(syncQuestions(db, bank(question("second")))).rejects.toThrow(/cannot be removed/);
    expect(await db.question.count()).toBe(2);
  });
  it("keeps users separate and guest merge insert-only, including explicit unseen", async () => {
    await saveProgress(db, firstUser, "first", "unseen");
    await saveProgress(db, secondUser, "first", "completed");
    const result = await importGuestProgress(db, firstUser, [{ questionId: "first", status: "completed" }, { questionId: "second", status: "review_later" }, { questionId: "unknown", status: "completed" }]);
    expect(result.progress).toEqual({ first: "unseen", second: "review_later" });
    expect(result.acknowledged).toEqual(["first", "second"]);
    expect((await db.userProgress.findUniqueOrThrow({ where: { userId_questionId: { userId: secondUser, questionId: "first" } } })).status).toBe("completed");
    await expect(saveProgress(db, firstUser, "first", "invalid")).rejects.toThrow();
    await expect(importGuestProgress(db, firstUser, [{ questionId: "first", status: "invalid" }])).rejects.toThrow();
    expect(await db.userProgress.count()).toBe(3);
  });
  it("makes repeated vote requests idempotent and removes only the caller's vote", async () => {
    await Promise.all(Array.from({ length: 5 }, () => saveVote(db, firstUser, "first", true)));
    expect(await db.questionVote.count()).toBe(1);
    await saveVote(db, secondUser, "first", true);
    expect(await saveVote(db, firstUser, "first", false)).toEqual({ voted: false, popularity: 1 });
    expect(await saveVote(db, firstUser, "first", false)).toEqual({ voted: false, popularity: 1 });
  });
  it("persists one UTC daily assignment across concurrent requests and content additions", async () => {
    const now = new Date("2026-10-15T00:01:00Z");
    const choices = await Promise.all(Array.from({ length: 8 }, () => getDailyQuestion(db, now)));
    expect(new Set(choices).size).toBe(1);
    expect(await db.dailyQuestion.count()).toBe(1);
    await syncQuestions(db, bank(question("first"), question("second"), question("third")));
    expect(await getDailyQuestion(db, now)).toBe(choices[0]);
    await getDailyQuestion(db, new Date("2026-10-16T00:00:00Z"));
    expect(await db.dailyQuestion.count()).toBe(2);
  });
});
