import type { PrismaClient } from "./generated/prisma/client";
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
    let created = 0;
    let updated = 0;
    for (const question of bank.questions) {
      const hash = contentHash(question);
      if (hashes.get(question.id) === hash) continue;
      const data = { ...question, contentHash: hash };
      await tx.question.upsert({ where: { id: question.id }, create: data, update: data });
      if (hashes.has(question.id)) updated++; else created++;
    }
    return { created, updated, unchanged: bank.questions.length - created - updated };
  }, { timeout: 30000 });
}
