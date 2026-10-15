import type { Prisma, PrismaClient } from "./generated/prisma/client";
import { contentHash, validateQuestionBank } from "./content";

export async function syncQuestions(db: PrismaClient, value: unknown) {
  const bank = validateQuestionBank(value);
  return db.$transaction(async tx => {
    // Serialise content syncs, including the missing-ID check.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(541820143)`;
    const existing = await tx.question.findMany({ select: { id: true, contentHash: true } });
    const incoming = new Set(bank.questions.map(question => question.id));
    const removed = existing.filter(question => !incoming.has(question.id));
    if (removed.length) throw new Error(`Question IDs cannot be removed. Retire these records: ${removed.map(question => question.id).join(", ")}`);
    const hashes = new Map(existing.map(question => [question.id, question.contentHash]));
    const additions: Prisma.QuestionCreateManyInput[] = [];
    const changes: { id: string; data: Prisma.QuestionUpdateInput }[] = [];
    for (const question of bank.questions) {
      const hash = contentHash(question);
      if (hashes.get(question.id) === hash) continue;
      const data = { ...question, contentHash: hash };
      if (hashes.has(question.id)) changes.push({ id: question.id, data });
      else additions.push(data);
    }
    // One bulk insert avoids a network round trip for each new question.
    const created = additions.length ? (await tx.question.createMany({ data: additions })).count : 0;
    for (const change of changes) {
      await tx.question.update({ where: { id: change.id }, data: change.data });
    }
    const updated = changes.length;
    return { created, updated, unchanged: bank.questions.length - created - updated };
  }, { timeout: 30000 });
}
