import { z } from "zod";
import { categories, difficulties, slugSchema, statusSchema, type ProgressStatus, type QuestionContent } from "./question-schema";
export type { QuestionContent, ProgressStatus } from "./question-schema";
export interface QuestionRecord extends QuestionContent { popularity: number }
export interface Viewer { id: string; name: string | null; image: string | null }
export interface AppData {
  questions: QuestionRecord[]; dailyQuestionId: string | null; viewer: Viewer | null;
  progress: Record<string, ProgressStatus>; votes: string[];
  authConfigured: boolean; databaseAvailable: boolean;
}
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
export const progressInputSchema = z.object({ questionId: slugSchema, status: statusSchema }).strict();
export const guestProgressSchema = z.array(progressInputSchema).max(1000).refine(records => new Set(records.map(record => record.questionId)).size === records.length, "Duplicate progress IDs");
export const voteInputSchema = z.object({ questionId: slugSchema, voted: z.boolean() }).strict();
export const questionFiltersSchema = z.object({
  category: z.enum(categories).optional(), difficulty: z.enum(difficulties).optional(),
  status: statusSchema.optional(), company: z.string().max(80).optional(),
  source: z.string().max(200).optional(), sort: z.enum(["popularity", "difficulty", "title"]).default("popularity"),
  q: z.string().max(200).optional()
});
export type QuestionFilters = z.infer<typeof questionFiltersSchema>;
// Server entry points implemented by backend: getAppData() in lib/queries.ts.
// Server actions in lib/actions.ts:
// setProgress(questionId, status): ActionResult<{status: ProgressStatus}>
// mergeGuestProgress(records): ActionResult<{acknowledged: string[]; progress: Record<string, ProgressStatus>}>
// setVote(questionId, voted): ActionResult<{voted: boolean; popularity: number}>
