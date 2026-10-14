# Security

Do not publish credentials or user data in issues or pull requests. Report a credential exposure privately to the repository owner and revoke the exposed credential immediately.

Environment files, database files, dumps and temporary downloads are ignored. `.env.example` is the only tracked environment-file exception and contains no secrets. CI runs a redacted secret scan across Git history and checks prohibited tracked file patterns. A clean scan is evidence from those checks, not a guarantee that every possible secret has been detected.

Authentication uses GitHub OAuth and signed JWT sessions. Account IDs come from the session on the server, never from mutation arguments. Source and rendered Markdown content is untrusted. Raw HTML is not rendered; links are restricted to safe schemes. The collector has a reviewed host list and bounded responses, timeouts and retries.

CI pull-request checks have read-only repository permissions and no real OAuth credentials. Only the scheduled collection job may write its candidate branch and PR. It runs trusted default-branch code and cannot merge content.

Dependency versions are pinned in the lockfile. Security overrides keep KaTeX and Prisma's development dependencies on patched releases. Review overrides when upgrading their parent packages, and rerun `npm audit`, validation, migrations and tests. Avoid changing database providers by merely replacing a connection URL.
