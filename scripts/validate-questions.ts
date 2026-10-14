import { readQuestionBank } from "../lib/content";
try {
  const bank = await readQuestionBank();
  console.log(`Validated ${bank.questions.length} questions, source references and KaTeX expressions.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Question validation failed.");
  process.exitCode = 1;
}
