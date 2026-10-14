import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import { httpsUrlSchema, slugSchema } from "./question-schema";

export const sourceRegistrySchema = z.object({
  schemaVersion: z.literal(1),
  sources: z.array(z.object({
    id: slugSchema, name: z.string().min(1), kind: z.enum(["github", "rss"]),
    url: httpsUrlSchema, reuse: z.string().min(1),
    allowedHosts: z.array(z.string().regex(/^[a-z0-9.-]+$/)).min(1),
  }).strict()).min(1),
}).strict();
export type SourceRegistry = z.infer<typeof sourceRegistrySchema>;
export const candidatesSchema = z.object({ schemaVersion: z.literal(1), candidates: z.array(z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/), url: httpsUrlSchema, title: z.string().min(1).max(300),
  sourceId: slugSchema, retrievedAt: z.iso.datetime(),
}).strict()) }).strict();
export type Candidate = z.infer<typeof candidatesSchema>["candidates"][number];
type Source = SourceRegistry["sources"][number];

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

function plainTitle(value: unknown): string {
  return String(value ?? "").replace(/<[^>]*>/g, "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 300);
}

export async function fetchReviewedSource(source: Source, fetcher: typeof fetch = fetch): Promise<string> {
  const initial = permitted(source.url, source);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      let target = initial;
      let response: Response | undefined;
      for (let redirect = 0; redirect < 4; redirect++) {
        response = await fetcher(target, {
          method: source.kind === "github" ? "HEAD" : "GET", redirect: "manual",
          headers: { "User-Agent": "OVERLEET-source-collector/1.0", Accept: "application/rss+xml, application/atom+xml, text/xml, text/html" },
          signal: AbortSignal.timeout(10000),
        });
        if (![301, 302, 303, 307, 308].includes(response.status)) break;
        const location = response.headers.get("location");
        if (!location) throw new Error("Source redirect has no destination.");
        target = permitted(new URL(location, target).toString(), source);
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

export function extractLinks(source: Source, body: string): { title: string; url: string }[] {
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

export async function collectCandidates(input: {
  registry: unknown; candidates: unknown; canonicalUrls: string[]; now?: Date;
  fetchSource?: (source: Source) => Promise<string>;
}) {
  const registry = sourceRegistrySchema.parse(input.registry);
  const current = candidatesSchema.parse(input.candidates);
  const seen = new Set([...current.candidates.map(candidate => candidate.url), ...input.canonicalUrls].map(normaliseUrl));
  const additions: Candidate[] = [];
  const failures: string[] = [];
  let successfulSources = 0;
  for (const source of registry.sources) {
    if (additions.length >= 10) break;
    try {
      const body = await (input.fetchSource ?? fetchReviewedSource)(source);
      const links = extractLinks(source, body);
      successfulSources++;
      for (const item of links) {
        const url = normaliseUrl(item.url);
        if (seen.has(url)) continue;
        seen.add(url);
        additions.push({ id: createHash("sha256").update(url).digest("hex").slice(0, 24), url,
          title: item.title, sourceId: source.id, retrievedAt: (input.now ?? new Date()).toISOString() });
        if (additions.length >= 10) break;
      }
    } catch { failures.push(source.id); }
  }
  if (!successfulSources) throw new Error("All reviewed sources failed. No candidate file was changed.");
  return { document: { schemaVersion: 1 as const, candidates: [...current.candidates, ...additions] }, added: additions.length, failures };
}

export function hasOpenCollectionPullRequest(pulls: { headRefName: string; state: string }[]): boolean {
  return pulls.some(pull => pull.state === "OPEN" && pull.headRefName === "automation/question-candidates");
}
