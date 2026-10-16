import { z } from "zod";

export const difficulties = ["easy", "medium", "hard"] as const;
export const categories = ["ml_theory", "statistics", "ab_testing", "llms", "python", "sql_databases"] as const;
export const statuses = ["unseen", "completed", "review_later"] as const;
export const categoryLabels = { ml_theory: "ML Theory", statistics: "Statistics", ab_testing: "A/B Testing", llms: "LLMs", python: "Python", sql_databases: "SQL & databases" } as const;
export const statusLabels = { unseen: "Unseen", completed: "Completed", review_later: "Needs review" } as const;
export const slugSchema = z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const statusSchema = z.enum(statuses);
export const httpsUrlSchema = z.url().refine(value => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
}, "Use an HTTPS URL without embedded credentials");
const sourceSchema = z.object({
  name: z.string().trim().min(1).max(200), url: httpsUrlSchema,
  accessedAt: z.iso.date(), reuse: z.string().trim().min(1).max(2000)
}).strict();
export const questionSchema = z.object({
  id: slugSchema, title: z.string().trim().min(1).max(200),
  difficulty: z.enum(difficulties), category: z.enum(categories),
  companyTags: z.array(z.string().trim().min(1).max(80)).max(10),
  companyEvidence: z.record(z.string(), httpsUrlSchema),
  questionMarkdown: z.string().trim().min(1).max(20000),
  tldrAnswer: z.string().trim().min(1).max(3000),
  detailedAnswerMarkdown: z.string().trim().min(1).max(40000),
  keyTakeaways: z.array(z.string().trim().min(1).max(1000)).min(3).max(4),
  sources: z.array(sourceSchema).min(1).max(10), active: z.boolean()
}).strict().superRefine((question, ctx) => {
  for (const company of question.companyTags) {
    if (!question.sources.some(source => source.url === question.companyEvidence[company])) {
      ctx.addIssue({ code: "custom", path: ["companyEvidence", company], message: "Company tags require evidence from a listed source" });
    }
  }
  for (const company of Object.keys(question.companyEvidence)) {
    if (!question.companyTags.includes(company)) ctx.addIssue({ code: "custom", path: ["companyEvidence", company], message: "Evidence must match a company tag" });
  }
});
export const questionBankSchema = z.object({ schemaVersion: z.literal(1), questions: z.array(questionSchema).min(1) }).strict().superRefine((bank, ctx) => {
  const seen = new Set<string>();
  const titles = new Set<string>();
  const prompts = new Set<string>();
  const normalise = (text: string) => text.normalize("NFKC").toLocaleLowerCase("en-GB").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  for (const [index, question] of bank.questions.entries()) {
    if (seen.has(question.id)) ctx.addIssue({ code: "custom", path: ["questions", index, "id"], message: "Duplicate question ID" });
    seen.add(question.id);
    const title = normalise(question.title);
    const prompt = normalise(question.questionMarkdown);
    if (titles.has(title)) ctx.addIssue({ code: "custom", path: ["questions", index, "title"], message: "Duplicate normalised title" });
    if (prompts.has(prompt)) ctx.addIssue({ code: "custom", path: ["questions", index, "questionMarkdown"], message: "Duplicate normalised question" });
    titles.add(title);
    prompts.add(prompt);
  }
});
export type QuestionContent = z.infer<typeof questionSchema>;
export type QuestionBank = z.infer<typeof questionBankSchema>;
export type ProgressStatus = z.infer<typeof statusSchema>;
