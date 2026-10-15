import "dotenv/config";
import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { Pool } from "pg";

const authSecret = "overleet-browser-test-secret";
const guestKey = "overleet:v1:guest:progress";
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 2, connectionTimeoutMillis: 5000 });
const createdUsers: string[] = [];
let questionIds: string[];

test.beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) throw new Error("Authenticated browser tests require TEST_DATABASE_URL pointing to the seeded disposable test database.");
  const result = await pool.query<{ id: string }>('SELECT "id" FROM "Question" WHERE "active" = true ORDER BY "id" LIMIT 2');
  questionIds = result.rows.map(row => row.id);
  expect(questionIds).toHaveLength(2);
});

test.afterAll(async () => {
  try { if (createdUsers.length) await pool.query('DELETE FROM "User" WHERE "id" = ANY($1::text[])', [createdUsers]); }
  finally { await pool.end(); }
});

async function createUser(name: string) {
  const id = `browser-test-${randomUUID()}`;
  await pool.query('INSERT INTO "User" ("id", "githubId", "name") VALUES ($1, $2, $3)', [id, id, name]);
  createdUsers.push(id);
  return { id, name };
}

async function useAccount(context: BrowserContext, user: { id: string; name: string }) {
  const value = await encode({ secret: authSecret, token: { sub: user.id, userId: user.id, name: user.name }, maxAge: 3600 });
  const baseURL = test.info().project.use.baseURL;
  if (!baseURL) throw new Error("Authenticated browser tests require a configured baseURL.");
  const origin = new URL(baseURL).origin;
  await context.addCookies([{ name: "next-auth.session-token", value, url: origin, httpOnly: true, sameSite: "Lax" }]);
}

test("account status wins guest import, including an explicit unseen status", async ({ page, context }) => {
  const user = await createUser("Browser import test");
  await pool.query('INSERT INTO "UserProgress" ("userId", "questionId", "status", "updatedAt") VALUES ($1, $2, $3, NOW())', [user.id, questionIds[0], "unseen"]);
  await page.goto("/");
  await page.evaluate(({ guestKey, questionIds }) => localStorage.setItem(guestKey, JSON.stringify({ [questionIds[0]]: "completed", [questionIds[1]]: "review_later" })), { guestKey, questionIds });
  await useAccount(context, user);
  await page.reload();
  await expect(page.getByText(user.name, { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), guestKey)).toBe("{}");
  const records = await pool.query<{ questionId: string; status: string }>('SELECT "questionId", "status" FROM "UserProgress" WHERE "userId" = $1 ORDER BY "questionId"', [user.id]);
  expect(Object.fromEntries(records.rows.map(row => [row.questionId, row.status]))).toEqual({ [questionIds[0]]: "unseen", [questionIds[1]]: "review_later" });
  await page.goto(`/questions/${questionIds[0]}`);
  await expect(page.getByRole("button", { name: "Mark completed", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Mark completed", exact: true }).click();
  await expect(page.getByRole("button", { name: "Completed", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Vote for this question/ }).click();
  await expect(page.getByRole("button", { name: /Remove vote/ })).toHaveAttribute("aria-pressed", "true");
  expect((await pool.query('SELECT 1 FROM "QuestionVote" WHERE "userId" = $1 AND "questionId" = $2', [user.id, questionIds[0]])).rowCount).toBe(1);
  await page.getByRole("button", { name: /Remove vote/ }).click();
  await expect(page.getByRole("button", { name: /Vote for this question/ })).toHaveAttribute("aria-pressed", "false");
  expect((await pool.query('SELECT 1 FROM "QuestionVote" WHERE "userId" = $1', [user.id])).rowCount).toBe(0);
});

test("failed guest import preserves browser records until a successful retry", async ({ page, context }) => {
  const user = await createUser("Browser retry test");
  const guest = { [questionIds[0]]: "completed" };
  await page.goto("/");
  await page.evaluate(({ guestKey, guest }) => localStorage.setItem(guestKey, JSON.stringify(guest)), { guestKey, guest });
  let failImport = true;
  await page.route(`${new URL(page.url()).origin}/**`, route => route.request().method() === "POST" && route.request().headers()["next-action"] && failImport ? route.abort("failed") : route.continue());
  await useAccount(context, user);
  await page.reload();
  await expect(page.getByRole("button", { name: "Retry guest import", exact: true })).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "{}"), guestKey)).toEqual(guest);
  expect((await pool.query('SELECT 1 FROM "UserProgress" WHERE "userId" = $1', [user.id])).rowCount).toBe(0);
  failImport = false;
  await page.getByRole("button", { name: "Retry guest import", exact: true }).click();
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), guestKey)).toBe("{}");
  await expect(page.getByRole("button", { name: "Retry guest import", exact: true })).toHaveCount(0);
  expect((await pool.query('SELECT "status" FROM "UserProgress" WHERE "userId" = $1 AND "questionId" = $2', [user.id, questionIds[0]])).rows[0].status).toBe("completed");
});

test("logout and account switching keep drafts, checklists and statuses separate", async ({ page, context }) => {
  const first = await createUser("Browser account one");
  const second = await createUser("Browser account two");
  await useAccount(context, first);
  await page.goto(`/questions/${questionIds[0]}`);
  await expect(page.getByText(first.name, { exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Your answer", exact: true }).fill("An answer belonging to account one.");
  await page.getByRole("button", { name: "Reveal model answer", exact: true }).click();
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Mark completed", exact: true }).click();
  await expect(page.getByRole("button", { name: "Completed", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByText("Guest workspace", { exact: true })).toBeVisible();
  await page.goto(`/questions/${questionIds[0]}`);
  await expect(page.getByRole("textbox", { name: "Your answer", exact: true })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Mark completed", exact: true })).toHaveAttribute("aria-pressed", "false");
  await useAccount(context, second);
  await page.reload();
  await expect(page.getByText(second.name, { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Your answer", exact: true })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Mark completed", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Reveal model answer", exact: true }).click();
  await expect(page.getByRole("checkbox").first()).not.toBeChecked();
  await useAccount(context, first);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Your answer", exact: true })).toHaveValue("An answer belonging to account one.");
  await expect(page.getByRole("button", { name: "Completed", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Reveal model answer", exact: true }).click();
  await expect(page.getByRole("checkbox").first()).toBeChecked();
});
