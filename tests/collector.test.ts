import { describe, expect, it, vi } from "vitest";
import { candidatesSchema, collectCandidates, extractLinks, fetchReviewedSource, hasOpenCollectionPullRequest, normaliseUrl, validateCandidateReviewLinks } from "../lib/collector";

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

const questionsSource = { id: "interview-questions", name: "Interview questions", kind: "github_questions" as const, url: "https://github.com/reviewed/interviews/blob/main/Statistics.md", reuse: "Topics only; write original answers", allowedHosts: ["github.com", "raw.githubusercontent.com"] };
const questionRegistry = { schemaVersion: 1, sources: [questionsSource] };
const questions = (count: number) => Array.from({ length: count }, (_, i) => `### Q${i + 1}: Explain concept ${i + 1}? ###\n\nAn answer that must not be stored.\n`).join("\n");

describe("individual GitHub question collection", () => {
  it("fingerprints the full question while limiting display titles to 300 characters", () => {
    const prefix = "Explain ".repeat(50);
    const links = extractLinks(questionsSource, `### Q1: ${prefix}bias?\n### Q2: ${prefix}variance?`);
    expect(links).toHaveLength(2);
    expect(links[0].title).toHaveLength(300);
    expect(links[0].sourceQuestion?.fingerprint).not.toBe(links[1].sourceQuestion?.fingerprint);
  });
  it("rejects duplicate candidate IDs and invalid review outcomes", async () => {
    const result = await collectCandidates({ registry: questionRegistry, candidates: empty, canonicalUrls: [], fetchSource: async () => questions(1) });
    const candidate = result.document.candidates[0];
    expect(candidatesSchema.safeParse({ schemaVersion: 1, candidates: [candidate, candidate] }).success).toBe(false);
    expect(candidatesSchema.safeParse({ schemaVersion: 1, candidates: [candidate, { ...candidate, id: "0".repeat(24) }] }).success).toBe(false);
    for (const review of [
      { status: "drafted", note: "Reviewed" },
      { status: "drafted", questionIds: ["same", "same"], note: "Reviewed" },
      { status: "covered", note: "Already covered" },
      { status: "covered", questionIds: [], note: "Already covered" },
      { status: "covered", questionIds: ["same", "same"], note: "Already covered" },
      { status: "dismissed", questionIds: ["unexpected"], note: "Covered" },
      { status: "dismissed", note: " " },
    ]) expect(candidatesSchema.safeParse({ schemaVersion: 1, candidates: [{ ...candidate, review }] }).success).toBe(false);
  });
  it.each(["drafted", "covered"])("requires %s review links to resolve to an existing question, including retired questions", async status => {
    const result = await collectCandidates({ registry: questionRegistry, candidates: empty, canonicalUrls: [], fetchSource: async () => questions(1) });
    const reviewed = { ...result.document, candidates: result.document.candidates.map(candidate => ({ ...candidate, review: { status, questionIds: ["retired-original"], note: "Reviewed original answer" } })) };
    expect(() => validateCandidateReviewLinks(reviewed, ["different-question"])).toThrow(/missing question retired-original/);
    expect(validateCandidateReviewLinks(reviewed, ["retired-original"])).toEqual(reviewed);
  });
  it("extracts only actual top-level numbered headings and preserves section links", async () => {
    const body = `# Contents\n- [Q1: TOC question?](#q1)\n\n### Q1: What is **bias**? ###\nAnswer: What is variance?\n\n\`\`\`md\n### Q2: Code example?\n\`\`\`\n\n> ### Q3: Quoted example?\n\n### Q2: What is variance? ###\nAnswer text.\n`;
    const result = await collectCandidates({ registry: questionRegistry, candidates: empty, canonicalUrls: [questionsSource.url], fetchSource: async () => body });
    expect(result.added).toBe(2);
    expect(result.document.candidates.map(candidate => candidate.title)).toEqual(["What is bias?", "What is variance?"]);
    expect(result.document.candidates[0].url).toBe(`${questionsSource.url}#q1-what-is-bias`);
    expect(JSON.stringify(result.document)).not.toContain("Answer text");
  });
  it("keeps identities stable across numbering, punctuation and Markdown changes, but detects rewritten questions", async () => {
    const collect = (body: string, candidates: unknown = empty) => collectCandidates({ registry: questionRegistry, candidates, canonicalUrls: [], fetchSource: async () => body });
    const first = await collect("### Q1: What is **bias**? ###");
    const again = await collect("### Q99: WHAT is bias! ###", first.document);
    expect(again.added).toBe(0);
    const rewritten = await collect("### Q99: How does bias affect estimates? ###", first.document);
    expect(rewritten.added).toBe(1);
    const added = await collect("### Q1: What is bias?\n### Q2: What is variance?", first.document);
    expect(added.added).toBe(1);
  });
  it("deduplicates an exact canonical section without suppressing other questions in its document", async () => {
    const result = await collectCandidates({ registry: questionRegistry, candidates: empty,
      canonicalUrls: [`${questionsSource.url}#q1-explain-concept-1`], fetchSource: async () => questions(2) });
    expect(result.added).toBe(1);
    expect(result.document.candidates[0].title).toBe("Explain concept 2?");
  });
  it("retains review decisions and deduplicates reviewed records", async () => {
    const first = await collectCandidates({ registry: questionRegistry, candidates: empty, canonicalUrls: [], fetchSource: async () => questions(3) });
    const reviews = [
      { status: "drafted", questionIds: ["original-concept"], note: "Independent author and critic review" },
      { status: "covered", questionIds: ["existing-concept"], note: "Existing question covers the same learning objective" },
      { status: "dismissed", note: "Outside the supported topics" },
    ];
    const reviewed = { ...first.document, candidates: first.document.candidates.map((candidate, i) => ({ ...candidate, review: reviews[i] })) };
    const result = await collectCandidates({ registry: questionRegistry, candidates: reviewed, canonicalUrls: [], fetchSource: async () => questions(3) });
    expect(result.added).toBe(0);
    expect(result.document).toEqual(reviewed);
  });
  it("keeps uncollected backlog eligible on later runs and prioritises question documents", async () => {
    const registry = { schemaVersion: 1, sources: [source, questionsSource] };
    const fetchSource = async (item: { kind: string }) => item.kind === "rss" ? feed(["https://example.org/news"]) : questions(14);
    const first = await collectCandidates({ registry, candidates: empty, canonicalUrls: [], fetchSource });
    expect(first.added).toBe(10);
    expect(first.document.candidates.every(candidate => candidate.sourceQuestion)).toBe(true);
    const second = await collectCandidates({ registry, candidates: first.document, canonicalUrls: [], fetchSource });
    expect(second.added).toBe(5);
    const third = await collectCandidates({ registry, candidates: second.document, canonicalUrls: [], fetchSource });
    expect(third.added).toBe(0);
  });
  it("shares the allowance between question documents", async () => {
    const second = { ...questionsSource, id: "ml-questions", url: questionsSource.url.replace("Statistics.md", "ML.md") };
    const result = await collectCandidates({ registry: { schemaVersion: 1, sources: [questionsSource, second] }, candidates: empty, canonicalUrls: [], fetchSource: async () => questions(20) });
    expect(result.document.candidates.filter(candidate => candidate.sourceId === second.id)).toHaveLength(5);
    expect(result.document.candidates.filter(candidate => candidate.sourceId === questionsSource.id)).toHaveLength(5);
  });
  it("reports documents without recognised headings as failures", async () => {
    await expect(collectCandidates({ registry: questionRegistry, candidates: empty, canonicalUrls: [], fetchSource: async () => "# Contents\n- [Q1: Linked question](link)" })).rejects.toThrow(/All reviewed sources/);
    const result = await collectCandidates({ registry: { schemaVersion: 1, sources: [questionsSource, source] }, candidates: empty, canonicalUrls: [], fetchSource: async item => item.kind === "rss" ? feed(["https://example.org/a"]) : "# Changed upstream format" });
    expect(result.failures).toEqual([questionsSource.id]);
  });
  it("fetches only the reviewed raw document with bounded GET and requires the raw host", async () => {
    const fetcher = vi.fn(async () => new Response(questions(1)));
    expect(await fetchReviewedSource(questionsSource, fetcher)).toContain("Q1");
    expect(fetcher).toHaveBeenCalledWith("https://raw.githubusercontent.com/reviewed/interviews/main/Statistics.md", expect.objectContaining({ method: "GET", redirect: "manual" }));
    await expect(fetchReviewedSource({ ...questionsSource, allowedHosts: ["github.com"] }, fetcher)).rejects.toThrow(/reviewed hosts/);
  });
  it("rejects redirects to another repository even on an allowed host", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 302, headers: { location: "https://raw.githubusercontent.com/attacker/interviews/main/Statistics.md" } }));
    await expect(fetchReviewedSource(questionsSource, fetcher)).rejects.toThrow(/three attempts/);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("rejects oversized bodies both by declared length and while streaming", async () => {
    const declared = vi.fn(async () => new Response("body", { headers: { "content-length": "2000001" } }));
    await expect(fetchReviewedSource(questionsSource, declared)).rejects.toThrow(/three attempts/);
    const streamed = vi.fn(async () => new Response("x".repeat(2_000_001)));
    await expect(fetchReviewedSource(questionsSource, streamed)).rejects.toThrow(/three attempts/);
  });
});
