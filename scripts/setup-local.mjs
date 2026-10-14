import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";

const password = randomBytes(24).toString("hex");
const sessionSecret = randomBytes(32).toString("hex");
const contents = [
  "# Local configuration. Never commit this file.",
  `POSTGRES_PASSWORD=${password}`,
  `DATABASE_URL=postgresql://overleet:${password}@127.0.0.1:5432/overleet`,
  `NEXTAUTH_SECRET=${sessionSecret}`,
  "NEXTAUTH_URL=http://localhost:3000", "GITHUB_ID=", "GITHUB_SECRET=", "",
].join("\n");
try {
  await writeFile(".env", contents, { flag: "wx", mode: 0o600 });
  console.log("Created .env with local database and session secrets. Add OAuth credentials to enable sign-in.");
} catch (error) {
  if (error.code === "EEXIST") console.log("An existing .env was preserved.");
  else { console.error("Could not create local configuration."); process.exitCode = 1; }
}
