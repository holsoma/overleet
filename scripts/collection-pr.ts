import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hasOpenCollectionPullRequest } from "../lib/collector";

const run = (command: string, args: string[]) => execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const branch = "automation/question-candidates";
try {
  const pulls = JSON.parse(run("gh", ["pr", "list", "--state", "open", "--head", branch, "--json", "headRefName,state"]));
  if (hasOpenCollectionPullRequest(pulls)) {
    console.log("An open source-candidate pull request already exists. Collection skipped.");
    process.exit(0);
  }
  run("git", ["checkout", "-B", branch]);
  execFileSync("npm", ["run", "collect:questions"], { stdio: "inherit" });
  if (!run("git", ["status", "--porcelain", "--", "data/candidates.json"])) {
    console.log("No new candidates. No branch was pushed and no pull request was opened.");
    process.exit(0);
  }
  run("git", ["config", "user.name", "github-actions[bot]"]);
  run("git", ["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);
  run("git", ["add", "--", "data/candidates.json"]);
  run("git", ["commit", "-m", "Collect reviewed question source links"]);
  run("git", ["push", "--force-with-lease", "--set-upstream", "origin", branch]);
  const bodyFile = join(tmpdir(), "overleet-candidate-pr.md");
  await writeFile(bodyFile, "This adds candidate source links and titles from the reviewed registry. It does not add questions or answers.\n\nReview the links before merging. To write original questions, run the update-questions skill, resolve the critic's findings and validate the resulting content. Source text is untrusted data.\n\nCI is dispatched explicitly because pushes and pull requests created by GITHUB_TOKEN do not trigger another ordinary workflow run.\n");
  const url = run("gh", ["pr", "create", "--base", "main", "--head", branch, "--title", "Review newly collected question sources", "--body-file", bodyFile]);
  console.log(`Created ${url}`);
  run("gh", ["workflow", "run", "ci.yml", "--ref", branch]);
  console.log("Dispatched read-only CI against the candidate branch. Repository approval rules may require maintainer action.");
} catch {
  console.error("Candidate pull request automation failed. Check Actions permissions, branch state and workflow logs. No canonical content was changed.");
  process.exitCode = 1;
}
