import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const version = "8.24.3";
const platforms = {
  win32: { archive: "windows_x64.zip", checksum: "3f1a35578631dbfe633cc5b49e6c906e55ff14a4bfd7336a10fb27fe33b6dcd2", binary: "gitleaks.exe" },
  linux: { archive: "linux_x64.tar.gz", checksum: "9991e0b2903da4c8f6122b5c3186448b927a5da4deef1fe45271c3793f4ee29c", binary: "gitleaks" },
};
const platform = platforms[process.platform];
if (!platform || process.arch !== "x64") throw new Error("The pinned scanner currently supports Linux x64 and Windows x64.");
const directory = resolve(".cache", `gitleaks-${version}`);
const archive = resolve(directory, platform.archive);
await mkdir(directory, { recursive: true });
let bytes;
try { bytes = await readFile(archive); } catch {
  const response = await fetch(`https://github.com/gitleaks/gitleaks/releases/download/v${version}/gitleaks_${version}_${platform.archive}`, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error("Could not download the pinned secret scanner.");
  bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(archive, bytes);
}
if (createHash("sha256").update(bytes).digest("hex") !== platform.checksum) throw new Error("The secret scanner checksum did not match. Nothing was executed.");
execFileSync("tar", [process.platform === "win32" ? "-xf" : "-xzf", archive, "-C", directory], { stdio: "inherit" });
const binary = resolve(directory, platform.binary);
execFileSync(binary, ["protect", "--staged", "--redact", "--no-banner"], { stdio: "inherit" });
let hasHistory = false;
try { execFileSync("git", ["rev-parse", "--verify", "HEAD"], { stdio: "ignore" }); hasHistory = true; } catch { /* Initial staged files were scanned above. */ }
if (hasHistory) execFileSync(binary, ["git", "--redact", "--no-banner", "--log-opts=--all"], { stdio: "inherit" });
