import type { QuestionContent } from "../lib/question-schema";

export function question(id = "test-question"): QuestionContent {
  return { id, title: `Test question ${id}`, difficulty: "easy", category: "statistics", companyTags: [], companyEvidence: {},
    questionMarkdown: `For sample ${id}, what does the mean measure?`, tldrAnswer: "The arithmetic average.",
    detailedAnswerMarkdown: "For a finite sample, $\\bar{x}=\\frac{1}{n}\\sum_i x_i$. It is sensitive to outliers.",
    keyTakeaways: ["Define the sample.", "Compute the average.", "Check the effect of outliers."],
    sources: [{ name: "Reference", url: "https://example.org/reference", accessedAt: "2026-10-15", reuse: "Original explanation; reference only." }], active: true };
}
export const bank = (...questions: QuestionContent[]) => ({ schemaVersion: 1, questions });
