import { describe, expect, it } from "vitest";
import { collectionFailureMessage } from "../lib/collection-errors";

describe("collection failure reporting", () => {
  it("explains the repository setting and token permission together", () => {
    const message = collectionFailureMessage({ stderr: Buffer.from("GraphQL: GitHub Actions is not permitted to create or approve pull requests (createPullRequest)") }, "creating the candidate pull request");
    expect(message).toContain("Settings > Actions > General");
    expect(message).toContain("pull-requests: write");
    expect(message).toContain("organisation policy");
  });

  it("identifies a permission denial without printing command diagnostics", () => {
    const message = collectionFailureMessage({ stderr: "HTTP 403: Resource not accessible by integration\nprivate-command-diagnostic" }, "dispatching CI checks");
    expect(message).toContain("dispatching CI checks");
    expect(message).toContain("actions: write");
    expect(message).not.toContain("private-command-diagnostic");
  });

  it("identifies expired authentication without echoing credentials", () => {
    const message = collectionFailureMessage({ stderr: "HTTP 401: Bad credentials\nprivate-token-value" }, "checking existing pull requests");
    expect(message).toContain("GH_TOKEN");
    expect(message).not.toContain("private-token-value");
  });

  it("explains manual recovery when the pull request exists but CI was not dispatched", () => {
    const message = collectionFailureMessage(new Error("Unreported failure"), "dispatching CI checks");
    expect(message).toContain("pull request was created");
    expect(message).toContain("Run CI manually for automation/question-candidates");
    expect(message).toContain("later collection runs skip");
  });

  it("keeps unknown exception messages and command arguments private", () => {
    const message = collectionFailureMessage({ message: "private-connection-detail", stderr: "private-command-output", cmd: "private-command-arguments" }, "pushing the candidate branch");
    expect(message).toContain("pushing the candidate branch");
    expect(message).not.toContain("private-");
  });
});
