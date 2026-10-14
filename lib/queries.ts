import { getViewer, isAuthConfigured } from "./auth";
import { getDb } from "./db";
import { getDailyQuestion } from "./daily";
import { questionSchema } from "./question-schema";
import type { AppData } from "./contracts";
import { readQuestionBank } from "./content";

export async function getAppData(): Promise<AppData> {
  const authConfigured = isAuthConfigured();
  // Session errors must not turn a signed-in view into another user's state.
  let viewer: AppData["viewer"] = null;
  try { viewer = await getViewer(); } catch { /* Browsing remains available. */ }
  try {
    const db = getDb();
    const [rows, dailyQuestionId, progress, votes] = await Promise.all([
      db.question.findMany({ include: { _count: { select: { votes: true } } }, orderBy: { id: "asc" } }),
      getDailyQuestion(db),
      viewer ? db.userProgress.findMany({ where: { userId: viewer.id } }) : [],
      viewer ? db.questionVote.findMany({ where: { userId: viewer.id }, select: { questionId: true } }) : [],
    ]);
    return {
      questions: rows.map(row => {
        const content = { ...row } as Partial<typeof row>;
        delete content.contentHash;
        delete content.updatedAt;
        delete content._count;
        return { ...questionSchema.parse(content), popularity: row._count.votes };
      }),
      dailyQuestionId, viewer, progress: Object.fromEntries(progress.map(item => [item.questionId, item.status])),
      votes: votes.map(vote => vote.questionId), authConfigured, databaseAvailable: true,
    };
  } catch {
    const bank = await readQuestionBank();
    return { questions: bank.questions.map(question => ({ ...question, popularity: 0 })), dailyQuestionId: null, viewer,
      progress: {}, votes: [], authConfigured, databaseAvailable: false };
  }
}
