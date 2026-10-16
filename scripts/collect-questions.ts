import { readFile, writeFile } from "node:fs/promises";
import { collectCandidates } from "../lib/collector";
import { readQuestionBank } from "../lib/content";

try {
  const [registry, candidates, bank] = await Promise.all([
    readFile("data/sources.json", "utf8").then(JSON.parse),
    readFile("data/candidates.json", "utf8").then(JSON.parse), readQuestionBank(),
  ]);
  const result = await collectCandidates({ registry, candidates, canonicalUrls: bank.questions.flatMap(question => question.sources.map(source => source.url)) });
  if (result.failures.length) console.warn(`Some reviewed sources failed: ${result.failures.join(", ")}.`);
  if (result.added) await writeFile("data/candidates.json", `${JSON.stringify(result.document, null, 2)}\n`);
  console.log(`Collected ${result.added} new question or source candidates. No answers were generated or published.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Source collection failed.");
  process.exitCode = 1;
}
