import { describe, expect, it } from "vitest";
import { validateMarkdownMath, validateQuestionBank } from "../lib/content";
import { guestProgressSchema, questionFiltersSchema, voteInputSchema } from "../lib/contracts";
import { dailyCandidate } from "../lib/daily";
import { question, bank } from "./fixtures";

describe("canonical content contract", () => {
  it("accepts original content and renders supported math", () => {
    expect(validateQuestionBank(bank(question())).questions).toHaveLength(1);
    expect(() => validateMarkdownMath("$$\\frac{1}{2}+\\alpha$$")).not.toThrow();
  });
  it("rejects duplicate IDs, unsupported URLs and missing company evidence", () => {
    expect(() => validateQuestionBank(bank(question(), question()))).toThrow();
    expect(() => validateQuestionBank(bank({ ...question(), sources: [{ ...question().sources[0], url: "javascript:alert(1)" }] }))).toThrow();
    expect(() => validateQuestionBank(bank({ ...question(), companyTags: ["Google"] }))).toThrow();
  });
  it("rejects invalid KaTeX commands and malformed expressions", () => {
    expect(() => validateMarkdownMath("$\\thisDoesNotExist{x}$")).toThrow();
    expect(() => validateMarkdownMath("$\\frac{1}{$")).toThrow();
    expect(() => validateQuestionBank(bank({ ...question(), tldrAnswer: "$\\unknown$" }))).toThrow(/Invalid KaTeX/);
    expect(() => validateMarkdownMath("An unclosed $x + y")).toThrow();
    expect(() => validateMarkdownMath("$$\nx + y")).toThrow();
    expect(() => validateMarkdownMath("The cost is \\$5. `price $x` is code.")).not.toThrow();
  });
  it("validates user mutations and filters", () => {
    expect(guestProgressSchema.safeParse([{ questionId: "test", status: "completed" }, { questionId: "test", status: "unseen" }]).success).toBe(false);
    expect(voteInputSchema.safeParse({ questionId: "test", voted: "false" }).success).toBe(false);
    expect(questionFiltersSchema.safeParse({ category: "invented" }).success).toBe(false);
  });
});

describe("daily selection", () => {
  it("is order-independent and handles an empty bank", () => {
    expect(dailyCandidate(["z", "a", "m"], "2026-10-15")).toBe(dailyCandidate(["m", "z", "a"], "2026-10-15"));
    expect(dailyCandidate([], "2026-10-15")).toBeNull();
  });
});
