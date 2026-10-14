import { describe, expect, it, vi } from "vitest";
import { collectCandidates, extractLinks, fetchReviewedSource, hasOpenCollectionPullRequest, normaliseUrl } from "../lib/collector";

const source = { id: "reviewed-feed", name: "Reviewed feed", kind: "rss" as const, url: "https://example.org/feed.xml", reuse: "Links only", allowedHosts: ["example.org"] };
const empty = { schemaVersion: 1, candidates: [] };
const registry = { schemaVersion: 1, sources: [source] };
const feed = (urls: string[]) => `<rss><channel>${urls.map((url, i) => `<item><title>Item ${i}</title><link>${url}</link></item>`).join("")}</channel></rss>`;

describe("free source collection", () => {
  it("deduplicates existing and canonical URLs and caps each run at ten", async () => {
    const result = await collectCandidates({ registry, candidates: empty, canonicalUrls: ["https://example.org/0"], fetchSource: async () => feed(Array.from({ length: 20 }, (_, i) => `https://example.org/${i}`)) });
    expect(result.added).toBe(10);
    expect(result.document.candidates.some(candidate => candidate.url.endsWith("/0"))).toBe(false);
    const again = await collectCandidates({ registry, candidates: result.document, canonicalUrls: ["https://example.org/0"], fetchSource: async () => feed(result.document.candidates.map(candidate => candidate.url)) });
    expect(again.added).toBe(0);
    expect(again.document).toEqual(result.document);
  });
  it("rejects unapproved article hosts and unsafe URL schemes", () => {
    expect(extractLinks(source, feed(["https://unreviewed.example/post", "javascript:alert(1)", "https://example.org/ok"]))).toEqual([{ title: "Item 2", url: "https://example.org/ok" }]);
    expect(normaliseUrl("https://example.org/a?utm_source=test#section")).toBe("https://example.org/a");
  });
  it("parses Atom links without evaluating source text", () => {
    const result = extractLinks(source, '<feed><entry><title>Reference</title><link rel="alternate" href="https://example.org/ref"/></entry></feed>');
    expect(result).toEqual([{ title: "Reference", url: "https://example.org/ref" }]);
  });
  it("reports partial failures and rejects total failures", async () => {
    await expect(collectCandidates({ registry, candidates: empty, canonicalUrls: [], fetchSource: async () => { throw new Error("offline"); } })).rejects.toThrow(/All reviewed sources/);
    const result = await collectCandidates({ registry: { ...registry, sources: [source, { ...source, id: "second" }] }, candidates: empty, canonicalUrls: [], fetchSource: async item => { if (item.id === "second") throw new Error("offline"); return feed(["https://example.org/a"]); } });
    expect(result.failures).toEqual(["second"]);
  });
  it("retries at most three times and prevents redirects to unreviewed hosts", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 302, headers: { location: "http://127.0.0.1/secret" } }));
    await expect(fetchReviewedSource(source, fetcher)).rejects.toThrow(/three attempts/);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("recognises only an open collection pull request", () => {
    expect(hasOpenCollectionPullRequest([{ headRefName: "automation/question-candidates", state: "OPEN" }])).toBe(true);
    expect(hasOpenCollectionPullRequest([{ headRefName: "automation/question-candidates", state: "CLOSED" }])).toBe(false);
  });
});
