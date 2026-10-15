export type CollectionStep =
  | "checking existing pull requests"
  | "preparing the candidate branch"
  | "collecting source links"
  | "pushing the candidate branch"
  | "creating the candidate pull request"
  | "dispatching CI checks";

export function collectionFailureMessage(error: unknown, step: CollectionStep): string {
  // Inspect command diagnostics only to select a fixed explanation. Never print
  // stderr, command arguments or exception messages, which may contain secrets.
  const stderr = error && typeof error === "object" && "stderr" in error ? error.stderr : undefined;
  const detail = typeof stderr === "string" ? stderr : Buffer.isBuffer(stderr) ? stderr.toString("utf8") : "";
  if (/GitHub Actions is not permitted to create or approve pull requests/i.test(detail)) {
    return "GitHub refused to create the candidate pull request. Enable 'Allow GitHub Actions to create and approve pull requests' under repository Settings > Actions > General, and retain pull-requests: write in the collection job. An organisation policy may restrict this setting. The candidate branch may already exist; rerun collection after correcting permissions.";
  }
  if (/Resource not accessible by integration|Resource not accessible by personal access token|HTTP 403|permission[^\n]*denied/i.test(detail)) {
    return `GitHub denied permission while ${step}. Check both repository or organisation Actions policy and the collection job's token permissions: contents: write for the branch, pull-requests: write for the pull request, and actions: write for CI dispatch. No canonical question content was changed.`;
  }
  if (/HTTP 401|Bad credentials|authentication failed/i.test(detail)) {
    return `GitHub authentication failed while ${step}. Confirm that GH_TOKEN is supplied by the collection workflow. No credentials were printed.`;
  }
  if (step === "dispatching CI checks") {
    return "The candidate pull request was created, but its CI dispatch failed. Confirm that ci.yml exists on main and the candidate branch, permits workflow_dispatch, and that the collection job has actions: write. Run CI manually for automation/question-candidates; later collection runs skip an existing open pull request.";
  }
  return `Candidate collection failed while ${step}. Check the workflow step, repository access and branch state, then rerun collection. No canonical question content was changed.`;
}
