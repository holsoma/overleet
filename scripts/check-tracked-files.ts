import { execFileSync } from "node:child_process";

export function forbiddenTrackedFile(path: string): boolean {
  const value = path.replaceAll("\\", "/");
  const name = value.split("/").at(-1)!;
  if (name.startsWith(".env") && name !== ".env.example") return true;
  if (/(^|\/)(node_modules|\.next|\.vercel|out|coverage|test-results|playwright-report|\.cache|tmp)(\/|$)/.test(value)) return true;
  if (value.startsWith("lib/generated/")) return true;
  if (name.endsWith(".sql") && !/^prisma\/migrations\/[^/]+\/migration\.sql$/.test(value)) return true;
  if (/\.(backup|bak)$/.test(name) || name === ".pgpass") return true;
  return /\.(db(?:-.*)?|sqlite(?:3)?(?:-.*)?|dump|sql\.gz|log|tsbuildinfo)$/i.test(name);
}

try {
  const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).split("\0").filter(Boolean);
  const forbidden = files.filter(forbiddenTrackedFile);
  if (forbidden.length) { console.error(`Prohibited tracked files:\n${forbidden.join("\n")}`); process.exitCode = 1; }
  else console.log(`Checked ${files.length} tracked files. No prohibited files found.`);
} catch { console.error("Tracked-file check requires an initialised Git repository."); process.exitCode = 1; }
