# Free public deployment

Use Vercel Hobby for Next.js and Neon Free for PostgreSQL. This keeps the application's existing database and authentication model. The local Docker setup remains available.

Checked on 15 October 2026: [Vercel Hobby](https://vercel.com/docs/plans/hobby) is free for personal, non-commercial projects, with usage limits that can pause service. [Neon Free](https://neon.com/pricing) has no time limit and requires no card. Its database sleeps when idle, so the first request may be slower. Select the free plans, not a paid trial or paid add-on. Recheck the providers' terms before using this app commercially or increasing its traffic. No paid model, crawler, runner or custom domain is required.

## Current installation

The public app is [overleet.vercel.app](https://overleet.vercel.app/), hosted in the `holsoma/overleet` Vercel project on Hobby. Its dedicated Neon database is on Free. Both use Singapore; Vercel runs Node.js 22 and the managed database reports PostgreSQL 18.6. Local development and CI continue to use PostgreSQL 17.

The database contains all 250 accepted questions. Committed migrations and an unchanged second content sync succeeded. Database credentials, GitHub OAuth credentials and the session secret are scoped to production. Neon Auth is disabled because this application uses NextAuth. GitHub sign-in reaches the authorisation screen with read-only profile access; guest study also works.

The initial release was deployed from `expand-question-bank-and-deploy`. [Content PR #2](https://github.com/holsoma/overleet/pull/2) was merged on 15 October 2026 after the maintainer authorised a one-off administrator exception. Branch protection was restored and verified. Vercel's automatic production branch is `main`. Future content PRs still require human review; that one-off exception does not authorise further bypasses.

On 15 October 2026 the maintainer requested self-review and merging. Required approving reviews were set to zero and mandatory code-owner approval was disabled. The maintainer now reviews the diff and merges directly after checks pass; GitHub cannot record an author approving their own PR. Required PRs, up-to-date CI, resolved conversations, administrator enforcement and the ban on force pushes remain enabled. This setting does not authorise an agent to merge unreviewed content.

## Create the database

1. Create a dedicated Neon Free project named `overleet`. Choose a region near the Vercel function region. The Vercel Marketplace integration may choose the PostgreSQL version; the current installation was verified on 18.6. Do not reuse a database containing unrelated data.
2. Copy its pooled connection URL into `DATABASE_URL` in a private local environment. Copy the direct connection URL into `DIRECT_DATABASE_URL` for migrations. Keep the supplied TLS settings. Both URLs must identify the same database. Never commit or paste the credentials into an issue or PR.
3. From the reviewed revision, run `npm ci`, `npm run db:generate`, then `npm run db:deploy`. The last command validates content, applies committed migrations and synchronises the canonical question bank. It preserves user progress, votes and Daily Question assignments.
4. Run `npm run db:sync` again. An unchanged bank should report zero creations and zero updates. Restore the local database environment after administering the remote database.

The runtime uses a small PostgreSQL connection pool and retains TLS verification. Prisma migrations use the direct URL when supplied. See [Neon's Prisma connection guidance](https://neon.com/docs/guides/prisma). Database credentials belong only in private environment configuration; no `NEXT_PUBLIC_` variable should contain them.

## Create the application

Import `holsoma/overleet` into your personal Vercel Hobby account. Select the Next.js framework, repository root and Node.js 22.x. `vercel.json` supplies installation and build commands. Use `main` as the production branch after the content PR has received human review. A preview from a content branch is not evidence of maintainer approval.

Set these variables for the production environment:

| Variable | Value |
|---|---|
| `DATABASE_URL` | The dedicated Neon database's pooled connection URL |
| `NEXTAUTH_SECRET` | A new random secret, retained across deployments |
| `NEXTAUTH_URL` | The exact public HTTPS origin assigned to the app |
| `GITHUB_ID`, `GITHUB_SECRET` | Optional production GitHub OAuth application credentials |

`DIRECT_DATABASE_URL` is needed only by the operator running migrations. The deployment build validates content and compiles the application; it does not migrate or synchronise any database. Do not grant untrusted preview builds access to the production database or production OAuth secrets. Leave preview credentials absent for anonymous file-backed browsing, or give a trusted preview its own disposable database and session secret.

Deploy, confirm the production domain, set `NEXTAUTH_URL` to that origin and redeploy if it changed. Verify the public URL in a signed-out browser. Check that the question count is correct, the Daily Question is available, filters and pagination work, and a guest can save progress. A database warning indicates that the deployment is falling back to bundled content; resolve it before describing database-backed features as working.

For account sign-in, create a separate GitHub OAuth app whose homepage is the public HTTPS origin and whose callback is `<origin>/api/auth/callback/github`. Add its credentials to production and redeploy. Test one real login, progress save and logout. Without these credentials, anonymous study works and sign-in explains the missing configuration.

## Later releases and recovery

Keep question-content PRs subject to human review. Before releasing a reviewed change, back up the database, apply migrations and run `db:sync` against the selected deployment database. Then deploy that same revision. Do not run database administration against a different revision or an unreviewed pull request. Merged JSON changes alone do not update the database.

If a deployment fails, retain the previous working deployment and inspect its build logs. Do not reset PostgreSQL to fix a build failure. Rolling back application code does not reverse migrations or restore earlier question content. For a schema change, plan backwards compatibility and recovery before deployment. The README's PostgreSQL backup and restore guidance also applies to a hosted database using a private connection configuration.

Monitor free-plan usage in both provider dashboards. Do not enable a paid upgrade automatically when a limit is reached.
