import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMath from "remark-math";
import { visit } from "unist-util-visit";
import katex from "katex";
import { questionBankSchema, type QuestionBank, type QuestionContent } from "./question-schema";

export function validateMarkdownMath(markdown: string): void {
  const tree = unified().use(remarkParse).use(remarkMath).parse(markdown);
  visit(tree, (node) => {
    if (node.type === "text") {
      const raw = markdown.slice(node.position?.start.offset, node.position?.end.offset);
      if (raw.replace(/\\\$/g, "").includes("$")) throw new Error("Unmatched math delimiter. Escape currency dollar signs.");
    }
    if (node.type === "math" || node.type === "inlineMath") {
      if (node.type === "math") {
        const raw = markdown.slice(node.position?.start.offset, node.position?.end.offset).trim();
        const lines = raw.split(/\r?\n/);
        if (lines.length < 2 || !/^\${2,}\s*$/.test(lines.at(-1)!)) throw new Error("Unclosed display math delimiter.");
      }
      const value = (node as unknown as { value: string }).value;
      katex.renderToString(value, { throwOnError: true, strict: "error", trust: false, displayMode: node.type === "math" });
    }
  });
}

export function validateQuestionBank(value: unknown): QuestionBank {
  const bank = questionBankSchema.parse(value);
  for (const question of bank.questions) {
    for (const text of [question.questionMarkdown, question.tldrAnswer, question.detailedAnswerMarkdown, ...question.keyTakeaways]) {
      try { validateMarkdownMath(text); }
      catch { throw new Error(`Invalid KaTeX expression in question ${question.id}.`); }
    }
  }
  return bank;
}

export async function readQuestionBank(): Promise<QuestionBank> {
  return validateQuestionBank(JSON.parse(await readFile(join(process.cwd(), "data", "questions", "questions.json"), "utf8")));
}

export function contentHash(question: QuestionContent): string {
  // Parsing fixes field order and strips no user-owned data into the digest.
  return createHash("sha256").update(JSON.stringify(question)).digest("hex");
}
