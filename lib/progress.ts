import type { PrismaClient } from "./generated/prisma/client";
import { guestProgressSchema, progressInputSchema, voteInputSchema } from "./contracts";
import type { ProgressStatus } from "./question-schema";

export async function saveProgress(db: PrismaClient, userId: string, questionId: unknown, status: unknown) {
  const input = progressInputSchema.parse({ questionId, status });
  await db.question.findUniqueOrThrow({ where: { id: input.questionId }, select: { id: true } });
  await db.userProgress.upsert({
    where: { userId_questionId: { userId, questionId: input.questionId } },
    create: { userId, ...input }, update: { status: input.status },
  });
  return { status: input.status };
}

export async function importGuestProgress(db: PrismaClient, userId: string, value: unknown) {
  const records = guestProgressSchema.parse(value);
  return db.$transaction(async tx => {
    const found = await tx.question.findMany({ where: { id: { in: records.map(record => record.questionId) } }, select: { id: true } });
    const validIds = new Set(found.map(question => question.id));
    const known = records.filter(record => validIds.has(record.questionId));
    if (known.length) await tx.userProgress.createMany({ data: known.map(record => ({ ...record, userId })), skipDuplicates: true });
    const all = await tx.userProgress.findMany({ where: { userId }, select: { questionId: true, status: true } });
    const progress: Record<string, ProgressStatus> = Object.fromEntries(all.map(record => [record.questionId, record.status]));
    return { acknowledged: known.map(record => record.questionId), progress };
  });
}

export async function saveVote(db: PrismaClient, userId: string, questionId: unknown, voted: unknown) {
  const input = voteInputSchema.parse({ questionId, voted });
  return db.$transaction(async tx => {
    await tx.question.findUniqueOrThrow({ where: { id: input.questionId }, select: { id: true } });
    if (input.voted) await tx.questionVote.createMany({ data: [{ userId, questionId: input.questionId }], skipDuplicates: true });
    else await tx.questionVote.deleteMany({ where: { userId, questionId: input.questionId } });
    const popularity = await tx.questionVote.count({ where: { questionId: input.questionId } });
    return { voted: input.voted, popularity };
  });
}
