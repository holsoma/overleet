import "dotenv/config";
import { readQuestionBank } from "../lib/content";
import { getDb } from "../lib/db";
import { syncQuestions } from "../lib/sync";
try {
  // Read and validate before a connection is created.
  const bank = await readQuestionBank();
  const db = getDb();
  try { console.log(await syncQuestions(db, bank)); }
  finally { await db.$disconnect(); }
} catch {
  console.error("Question sync failed. Run validate:questions and check the database. Existing IDs must remain present; retire questions with active: false.");
  process.exitCode = 1;
}
