import { readFile } from "node:fs/promises";
import { readQuestionBank } from "../lib/content";
import { sourceRegistrySchema, validateCandidateReviewLinks } from "../lib/collector";
try {
  const [bank, registryValue, candidateValue] = await Promise.all([
    readQuestionBank(),
    readFile("data/sources.json", "utf8").then(JSON.parse),
    readFile("data/candidates.json", "utf8").then(JSON.parse),
  ]);
  const registry = sourceRegistrySchema.parse(registryValue);
  // Retired questions remain valid review targets; source records may outlive a retired registry entry.
  const candidates = validateCandidateReviewLinks(candidateValue, bank.questions.map(question => question.id));
  console.log(`Validated ${bank.questions.length} questions, source references and KaTeX expressions.`);
  console.log(`Validated ${registry.sources.length} source definitions and ${candidates.candidates.length} candidate records with review links.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Question validation failed.");
  process.exitCode = 1;
}
