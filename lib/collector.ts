import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { z } from "zod";
import { httpsUrlSchema, slugSchema } from "./question-schema";

export const sourceRegistrySchema = z.object({
  schemaVersion: z.literal(1),
  sources: z.array(z.object({
    id: slugSchema, name: z.string().min(1), kind: z.enum(["github", "github_questions", "rss"]),
    url: httpsUrlSchema, reuse: z.string().min(1),
    allowedHosts: z.array(z.string().regex(/^[a-z0-9.-]+$/)).min(1),
  }).strict()).min(1),
}).strict();
export type SourceRegistry = z.infer<typeof sourceRegistrySchema>;
export const candidatesSchema = z.object({ schemaVersion: z.literal(1), candidates: z.array(z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/), url: httpsUrlSchema, title: z.string().min(1).max(300),
  sourceId: slugSchema, retrievedAt: z.iso.datetime(),
  sourceQuestion: z.object({ fingerprint: z.string().regex(/^[a-f0-9]{64}$/), documentUrl: httpsUrlSchema }).strict().optional(),
  review: z.object({ status: z.enum(["drafted", "dismissed"]), questionIds: z.array(slugSchema).optional(), note: z.string().trim().min(1) }).strict().superRefine((review, context) => {
    const ids = review.questionIds ?? [];
    if (review.status === "drafted" && (!ids.length || new Set(ids).size !== ids.length)) context.addIssue({ code: "custom", message: "Drafted candidates require nonempty unique question IDs.", path: ["questionIds"] });
    if (review.status === "dismissed" && ids.length) context.addIssue({ code: "custom", message: "Dismissed candidates cannot reference drafted questions.", path: ["questionIds"] });
  }).optional(),
}).strict()) }).strict().superRefine((document, context) => {
  const ids = new Set<string>();
  const questions = new Set<string>();
  for (const [index, candidate] of document.candidates.entries()) {
    if (ids.has(candidate.id)) context.addIssue({ code: "custom", message: "Duplicate candidate ID.", path: ["candidates", index, "id"] });
    ids.add(candidate.id);
    if (candidate.sourceQuestion) {
      const key = `${normaliseUrl(candidate.sourceQuestion.documentUrl)}:${candidate.sourceQuestion.fingerprint}`;
      if (questions.has(key)) context.addIssue({ code: "custom", message: "Duplicate source question identity.", path: ["candidates", index, "sourceQuestion"] });
      questions.add(key);
    }
  }
});
export type Candidate = z.infer<typeof candidatesSchema>["candidates"][number];
type Source = SourceRegistry["sources"][number];
type Link = { title: string; url: string; sourceQuestion?: Candidate["sourceQuestion"] };

export function validateCandidateReviewLinks(value: unknown, questionIds: Iterable<string>) {
  const document = candidatesSchema.parse(value);
  const known = new Set(questionIds);
  for (const candidate of document.candidates) {
    for (const id of candidate.review?.questionIds ?? []) {
      if (!known.has(id)) throw new Error(`Candidate ${candidate.id} references missing question ${id}.`);
    }
  }
  return document;
}

export function normaliseUrl(value: string): string {
  const url = new URL(httpsUrlSchema.parse(value));
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) if (key.startsWith("utm_")) url.searchParams.delete(key);
  url.searchParams.sort();
  return url.toString();
}

function permitted(value: string, source: Source): string {
  const url = normaliseUrl(value);
  if (!source.allowedHosts.includes(new URL(url).hostname)) throw new Error("Source URL is outside its reviewed hosts.");
  return url;
}

function githubDocument(source: Source): { documentUrl: string; rawUrl: string } {
  const documentUrl = permitted(source.url, source);
  const url = new URL(documentUrl);
  const match = /^\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+\.md)$/i.exec(url.pathname);
  if (url.hostname !== "github.com" || !match || url.search) throw new Error("GitHub question sources must identify a reviewed Markdown document.");
  const rawUrl = permitted(`https://raw.githubusercontent.com/${match[1]}/${match[2]}/${match[3]}/${match[4]}`, source);
  return { documentUrl, rawUrl };
}

function plainTitle(value: unknown): string {
  return String(value ?? "").replace(/<[^>]*>/g, "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 300);
}

export async function fetchReviewedSource(source: Source, fetcher: typeof fetch = fetch): Promise<string> {
  const initial = source.kind === "github_questions" ? githubDocument(source).rawUrl : permitted(source.url, source);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      let target = initial;
      let response: Response | undefined;
      for (let redirect = 0; redirect < 4; redirect++) {
        response = await fetcher(target, {
          method: source.kind === "github" ? "HEAD" : "GET", redirect: "manual",
          headers: { "User-Agent": "OVERLEET-source-collector/1.0", Accept: "text/plain, application/rss+xml, application/atom+xml, text/xml, text/html" },
          signal: AbortSignal.timeout(10000),
        });
        if (![301, 302, 303, 307, 308].includes(response.status)) break;
        const location = response.headers.get("location");
        if (!location) throw new Error("Source redirect has no destination.");
        target = permitted(new URL(location, target).toString(), source);
        // The reviewed file is the complete retrieval boundary, even on an allowed host.
        if (source.kind === "github_questions" && target !== initial) throw new Error("Question document redirected outside its reviewed path.");
      }
      if (!response?.ok) throw new Error("Source returned an unsuccessful HTTP status.");
      if (source.kind === "github") return "";
      if (Number(response.headers.get("content-length") ?? 0) > 2_000_000) throw new Error("Source is too large.");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Source has no body.");
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 2_000_000) { await reader.cancel(); throw new Error("Source is too large."); }
        chunks.push(chunk.value);
      }
      return Buffer.concat(chunks).toString("utf8");
    } catch {
      if (attempt === 2) throw new Error(`Could not retrieve reviewed source ${source.id} after three attempts.`);
    }
  }
  throw new Error("Source retrieval failed.");
}

// Read only top-level headings: TOC links, answer paragraphs and fenced examples are not candidates.
function extractQuestions(source: Source, body: string): Link[] {
  const { documentUrl } = githubDocument(source);
  const tree = unified().use(remarkParse).parse(body);
  const slugs = new Map<string, number>();
  const links: Link[] = [];
  const text = (node: { type: string; value?: string; children?: unknown[] }): string => {
    if (node.type === "html") return "";
    if (node.value) return node.value;
    return (node.children ?? []).map(child => text(child as Parameters<typeof text>[0])).join("");
  };
  for (const node of tree.children) {
    if (node.type !== "heading") continue;
    const heading = text(node).trim();
    // GitHub heading anchors retain hyphens/underscores and remove punctuation.
    const base = heading.toLowerCase().replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, "").replace(/ /g, "-");
    const occurrence = slugs.get(base) ?? 0;
    slugs.set(base, occurrence + 1);
    const anchor = `${base}${occurrence ? `-${occurrence}` : ""}`;
    const match = /^Q\s*\d+\s*[:.)-]\s*(\S[\s\S]*)$/i.exec(heading);
    if (!match) continue;
    const title = plainTitle(match[1]);
    const normalised = match[1].normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    if (!normalised) continue;
    const fingerprint = createHash("sha256").update(normalised).digest("hex");
    links.push({ title, url: `${documentUrl}#${anchor}`, sourceQuestion: { fingerprint, documentUrl } });
  }
  if (!links.length) throw new Error("No recognised question headings in reviewed document.");
  return links;
}

export function extractLinks(source: Source, body: string): Link[] {
  if (source.kind === "github_questions") return extractQuestions(source, body);
  if (source.kind === "github") {
    const url = new URL(source.url);
    if (url.hostname !== "github.com" || !/^\/[^/]+\/[^/]+\/blob\/[^/]+\/.+/.test(url.pathname)) throw new Error("GitHub sources must identify a public document.");
    return [{ title: source.name, url: permitted(source.url, source) }];
  }
  const parsed = new XMLParser({ ignoreAttributes: false, processEntities: false }).parse(body);
  const raw = parsed?.rss?.channel?.item ?? parsed?.feed?.entry ?? [];
  const entries = Array.isArray(raw) ? raw : [raw];
  return entries.flatMap((entry: Record<string, unknown>) => {
    const links = Array.isArray(entry.link) ? entry.link : [entry.link];
    const link = links.find(value => typeof value === "string" || (value && typeof value === "object" && (!value["@_rel"] || value["@_rel"] === "alternate")));
    const value = typeof link === "string" ? link : link?.["@_href"];
    const title = plainTitle(typeof entry.title === "object" ? (entry.title as Record<string, unknown>)?.["#text"] : entry.title);
    if (!value || !title) return [];
    try { return [{ title, url: permitted(String(value), source) }]; } catch { return []; }
  });
}

const questionKey = (question: NonNullable<Candidate["sourceQuestion"]>) => `${normaliseUrl(question.documentUrl)}:${question.fingerprint}`;

export async function collectCandidates(input: {
  registry: unknown; candidates: unknown; canonicalUrls: string[]; now?: Date;
  fetchSource?: (source: Source) => Promise<string>;
}) {
  const registry = sourceRegistrySchema.parse(input.registry);
  const current = candidatesSchema.parse(input.candidates);
  const seen = new Set([...current.candidates.map(candidate => candidate.url), ...input.canonicalUrls].map(normaliseUrl));
  const seenQuestions = new Set(current.candidates.flatMap(candidate => candidate.sourceQuestion ? [questionKey(candidate.sourceQuestion)] : []));
  const canonicalSections = new Set(input.canonicalUrls.filter(value => new URL(value).hash).map(value => `${normaliseUrl(value)}${new URL(value).hash}`));
  const additions: Candidate[] = [];
  const failures: string[] = [];
  const queues: Link[][] = [];
  const queueSources: Source[] = [];
  // Question documents take precedence; round-robin prevents one document consuming the whole allowance.
  const sources = [...registry.sources].sort((a, b) => Number(b.kind === "github_questions") - Number(a.kind === "github_questions"));
  for (const source of sources) {
    try {
      const body = await (input.fetchSource ?? fetchReviewedSource)(source);
      queues.push(extractLinks(source, body));
      queueSources.push(source);
    } catch { failures.push(source.id); }
  }
  if (!queues.length) throw new Error("All reviewed sources failed. No candidate file was changed.");
  for (const questionPhase of [true, false]) {
    let remaining = true;
    while (remaining && additions.length < 10) {
      remaining = false;
      for (let i = 0; i < queues.length && additions.length < 10; i++) {
        if ((queueSources[i].kind === "github_questions") !== questionPhase) continue;
        let item: Link | undefined;
        while ((item = queues[i].shift())) {
          const key = item.sourceQuestion ? questionKey(item.sourceQuestion) : normaliseUrl(item.url);
          if (item.sourceQuestion ? seenQuestions.has(key) || canonicalSections.has(item.url) : seen.has(key)) continue;
          if (item.sourceQuestion) seenQuestions.add(key); else seen.add(key);
          additions.push({ id: createHash("sha256").update(key).digest("hex").slice(0, 24),
            url: item.sourceQuestion ? item.url : normaliseUrl(item.url), title: item.title,
            sourceId: queueSources[i].id, retrievedAt: (input.now ?? new Date()).toISOString(),
            ...(item.sourceQuestion ? { sourceQuestion: item.sourceQuestion } : {}) });
          break;
        }
        if (queues[i].length) remaining = true;
      }
    }
  }
  return { document: { schemaVersion: 1 as const, candidates: [...current.candidates, ...additions] }, added: additions.length, failures };
}

export function hasOpenCollectionPullRequest(pulls: { headRefName: string; state: string }[]): boolean {
  return pulls.some(pull => pull.state === "OPEN" && pull.headRefName === "automation/question-candidates");
}
