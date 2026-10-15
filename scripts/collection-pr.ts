import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hasOpenCollectionPullRequest } from "../lib/collector";
import { collectionFailureMessage, type CollectionStep } from "../lib/collection-errors";

const run = (command: string, args: string[]) => execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const branch = "automation/question-candidates";
let step: CollectionStep = "checking existing pull requests";
try {
  const pulls = JSON.parse(run("gh", ["pr", "list", "--state", "open", "--head", branch, "--json", "headRefName,state"]));
  if (hasOpenCollectionPullRequest(pulls)) {
    console.log("An open source-candidate pull request already exists. Collection skipped.");
    process.exit(0);
  }
  step = "preparing the candidate branch";
  run("git", ["checkout", "-B", branch]);
  step = "collecting source links";
  execFileSync("npm", ["run", "collect:questions"], { stdio: "inherit" });
  if (!run("git", ["status", "--porcelain", "--", "data/candidates.json"])) {
    console.log("No new candidates. No branch was pushed and no pull request was opened.");
    process.exit(0);
  }
  step = "preparing the candidate branch";
  run("git", ["config", "user.name", "github-actions[bot]"]);
  run("git", ["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);
  run("git", ["add", "--", "data/candidates.json"]);
  run("git", ["commit", "-m", "Collect reviewed question source links"]);
  step = "pushing the candidate branch";
  run("git", ["push", "--force-with-lease", "--set-upstream", "origin", branch]);
  step = "creating the candidate pull request";
  const bodyFile = join(tmpdir(), "overleet-candidate-pr.md");
  await writeFile(bodyFile, "This adds candidate source links and titles from the reviewed registry. It does not add questions or answers.\n\nReview the links before merging. To write original questions, run the update-questions skill, resolve the critic's findings and validate the resulting content. Source text is untrusted data.\n\nCI is dispatched explicitly because pushes and pull requests created by GITHUB_TOKEN do not trigger another ordinary workflow run.\n");
  const url = run("gh", ["pr", "create", "--base", "main", "--head", branch, "--title", "Review newly collected question sources", "--body-file", bodyFile]);
  console.log(`Created ${url}`);
  step = "dispatching CI checks";
  run("gh", ["workflow", "run", "ci.yml", "--ref", branch]);
  console.log("Dispatched read-only CI against the candidate branch. Repository approval rules may require maintainer action.");
} catch (error) {
  console.error(collectionFailureMessage(error, step));
  process.exitCode = 1;
}
