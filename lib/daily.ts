import { createHash } from "node:crypto";
import type { PrismaClient } from "./generated/prisma/client";

export function dailyCandidate(ids: string[], date: string): string | null {
  if (!ids.length) return null;
  const sorted = [...ids].sort();
  return sorted[createHash("sha256").update(date).digest().readUInt32BE(0) % sorted.length];
}

export async function getDailyQuestion(db: PrismaClient, now = new Date()): Promise<string | null> {
  const date = now.toISOString().slice(0, 10);
  const existing = await db.dailyQuestion.findUnique({ where: { date } });
  if (existing) return existing.questionId;
  const questions = await db.question.findMany({ where: { active: true }, select: { id: true }, orderBy: { id: "asc" } });
  const questionId = dailyCandidate(questions.map(question => question.id), date);
  if (!questionId) return null;
  // ON CONFLICT DO NOTHING makes concurrent first visits agree on the saved row.
  await db.dailyQuestion.createMany({ data: [{ date, questionId }], skipDuplicates: true });
  return (await db.dailyQuestion.findUniqueOrThrow({ where: { date } })).questionId;
}
