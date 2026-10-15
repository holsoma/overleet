import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import questionBank from "../../data/questions/questions.json" with { type: "json" };

const activeQuestions = questionBank.questions.filter(question => question.active);

async function capture(page: Page, name: string) {
  if (process.env.OVERLEET_CAPTURE_UI !== "1") return;
  await mkdir(".cache/ui", { recursive: true });
  await page.screenshot({ path: `.cache/ui/${name}.png`, fullPage: false });
}

test("guest can draft, reveal, self-check and record progress across page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Question bank." })).toBeVisible();
  await capture(page, "question-bank-desktop");
  await page.locator("[data-question-link]").first().click();
  await expect(page).toHaveURL(/\/questions\//);
  await expect(page.getByLabel("Your answer", { exact: true })).toBeVisible();
  const questionUrl = page.url();
  await expect(page.getByRole("heading", { name: "Check your understanding" })).toHaveCount(0);
  await capture(page, "workspace-desktop");
  await page.getByLabel("Your answer", { exact: true }).fill("I would first state my assumptions and explain the reasoning.");
  await page.reload();
  await expect(page.getByLabel("Your answer", { exact: true })).toHaveValue("I would first state my assumptions and explain the reasoning.");
  await page.getByRole("button", { name: "Reveal model answer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Check your understanding" })).toBeVisible();
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Mark completed", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Marked as completed.");
  await page.reload();
  await expect(page.getByRole("button", { name: "Completed", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Reveal model answer", exact: true }).click();
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  await page.getByRole("link", { name: "Your progress", exact: true }).click();
  await page.getByRole("link", { name: "View completed", exact: true }).click();
  await expect(page).toHaveURL(/status=completed/);
  await expect(page.locator("[data-question-link]")).toHaveCount(1);
  await page.goto(questionUrl);
  await page.getByRole("button", { name: "Review later", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Added to your review list.");
  await page.getByRole("button", { name: "Reset to unseen", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Reset to unseen.");
  await expect(page.getByLabel("Your answer", { exact: true })).toHaveValue("I would first state my assumptions and explain the reasoning.");
});

test("filters stay in the URL and empty results can be cleared", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Topic", exact: true }).selectOption("statistics");
  await expect(page).toHaveURL(/category=statistics/);
  await expect(page.locator("[data-question-link]")).toHaveCount(Math.min(25, activeQuestions.filter(question => question.category === "statistics").length));
  await page.getByRole("combobox", { name: "Difficulty", exact: true }).selectOption("hard");
  await expect(page).toHaveURL(/difficulty=hard/);
  const count = activeQuestions.filter(question => question.category === "statistics" && question.difficulty === "hard").length;
  expect(count).toBeGreaterThan(0);
  await expect(page.locator("[data-question-link]")).toHaveCount(Math.min(25, count));
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Topic", exact: true })).toHaveValue("statistics");
  await expect(page.getByRole("combobox", { name: "Difficulty", exact: true })).toHaveValue("hard");
  await expect(page.locator("[data-question-link]")).toHaveCount(Math.min(25, count));
  await page.getByRole("searchbox", { name: "Search questions" }).fill("there is no question with this title");
  await expect(page.getByRole("heading", { name: "No questions match these filters" })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).first().click();
  await expect(page.locator("[data-question-link]")).toHaveCount(Math.min(25, activeQuestions.length));
});

test("pagination keeps stable rows in the URL and resets when filters or sorting change", async ({ page }) => {
  const pageCount = Math.ceil(activeQuestions.length / 25);
  const sorted = [...activeQuestions].sort((a, b) => a.title.localeCompare(b.title, "en") || a.id.localeCompare(b.id, "en"));
  await page.goto("/?sort=title");
  await expect(page.locator(".app-shell")).toHaveAttribute("data-hydrated", "true");
  await expect(page.locator("[data-question-link]")).toHaveCount(Math.min(25, sorted.length));
  await expect(page.locator("[data-question-link]").first()).toHaveAttribute("href", `/questions/${sorted[0].id}`);
  if (pageCount > 1) {
    await page.getByRole("button", { name: "Next", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/page=2/);
    await expect(page.locator("[data-question-link]").first()).toHaveAttribute("href", `/questions/${sorted[25].id}`);
    await expect(page.getByRole("region", { name: "Question results", exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator("[data-question-link]").first()).toBeFocused();
    await expect(page.locator("tbody tr").first().locator("td").first()).toHaveText("26");
    await page.reload();
    await expect(page.locator("[data-question-link]").first()).toHaveAttribute("href", `/questions/${sorted[25].id}`);
    await page.getByRole("combobox", { name: "Sort by", exact: true }).selectOption("difficulty");
    await expect(page).not.toHaveURL(/page=/);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("combobox", { name: "Topic", exact: true }).selectOption("statistics");
    await expect(page).not.toHaveURL(/page=/);
  } else {
    await expect(page.getByRole("navigation", { name: "Question pages", exact: true })).toHaveCount(0);
  }
  await page.goto("/?sort=title&page=999999");
  const lastPageSize = sorted.length % 25 || 25;
  await expect(page.locator("[data-question-link]")).toHaveCount(lastPageSize);
  await expect(page.locator("[data-question-link]").first()).toHaveAttribute("href", `/questions/${sorted[(pageCount - 1) * 25].id}`);
  await page.goto("/?category=statistics&page=invalid");
  await expect(page.getByRole("combobox", { name: "Topic", exact: true })).toHaveValue("statistics");
  await expect(page.locator("tbody tr").first().locator("td").first()).toHaveText("01");
});

test("drafts are separated by question and guest identity", async ({ page }) => {
  await page.goto("/");
  const links = page.locator("[data-question-link]");
  const first = await links.nth(0).getAttribute("href");
  const second = await links.nth(1).getAttribute("href");
  const id = first!.split("/").at(-1)!;
  await page.evaluate(({ id }) => {
    localStorage.setItem(`overleet:v1:user:another-account:question:${id}`, JSON.stringify({ answer: "Private account answer", checks: [0, 1] }));
  }, { id });
  await page.goto(first!);
  await expect(page.getByLabel("Your answer", { exact: true })).toHaveValue("");
  await page.getByLabel("Your answer", { exact: true }).fill("Guest answer for the first question");
  await page.getByRole("button", { name: "Reveal model answer", exact: true }).click();
  await page.goto(second!);
  await expect(page.getByLabel("Your answer", { exact: true })).toHaveValue("");
  await expect(page.getByRole("heading", { name: "Check your understanding" })).toHaveCount(0);
  await page.goto(first!);
  await expect(page.getByLabel("Your answer", { exact: true })).toHaveValue("Guest answer for the first question");
});

test("a storage failure keeps the draft visible and reports unsaved progress", async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException("Storage disabled", "SecurityError"); }; });
  await page.goto("/");
  await page.locator("[data-question-link]").first().click();
  await page.getByLabel("Your answer", { exact: true }).fill("Keep this explanation on the page");
  await expect(page.getByLabel("Your answer", { exact: true })).toHaveValue("Keep this explanation on the page");
  await expect(page.getByRole("alert").filter({ hasText: "Copy it before leaving." })).toBeVisible();
  await page.getByRole("button", { name: "Mark completed", exact: true }).click();
  await expect(page.getByText("Browser storage is unavailable. Enable local storage to save guest progress, then try again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark completed", exact: true })).toHaveAttribute("aria-pressed", "false");
});

test("mobile layout fits the viewport and supports keyboard study controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  // Wait for hydration and Next.js focus restoration before the first keyboard input.
  await expect(page.locator(".app-shell")).toHaveAttribute("data-hydrated", "true");
  await expect(page.getByRole("heading", { name: "Question bank." })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await capture(page, "question-bank-mobile");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.locator("[data-question-link]").first().focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Reveal model answer", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Check your understanding" })).toBeVisible();
  await page.getByRole("checkbox").first().focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await capture(page, "workspace-mobile");
});

test("guest voting gives a sign-in explanation", async ({ page }) => {
  await page.goto("/");
  await page.locator("[data-question-link]").first().click();
  await page.getByRole("button", { name: /Vote for this question/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Sign in with GitHub to vote on a question." })).toBeVisible();
});

test("advanced filters are disclosed, retain URL state and remain clearable", async ({ page }) => {
  await page.goto("/");
  const more = page.getByRole("button", { name: /More filters/ });
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("combobox", { name: "Status", exact: true })).toBeHidden();
  await more.focus();
  await page.keyboard.press("Enter");
  await expect(more).toHaveAttribute("aria-expanded", "true");
  if (activeQuestions.every(question => !question.companyTags.length)) {
    await expect(page.getByRole("combobox", { name: "Company", exact: true })).toHaveCount(0);
  }
  await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("unseen");
  const source = activeQuestions[0].sources[0].name;
  await page.getByRole("combobox", { name: "Source", exact: true }).selectOption(source);
  await expect(more).toContainText("2");
  await more.click();
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await page.reload();
  await expect(more).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("combobox", { name: "Source", exact: true })).toHaveValue(source);
  await expect(page.getByRole("combobox", { name: "Status", exact: true })).toHaveValue("unseen");
  await page.getByRole("button", { name: "Clear filters", exact: true }).first().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await page.goto("/?company=Unknown%20company");
  await expect(more).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("combobox", { name: "Company", exact: true })).toHaveValue("Unknown company");
  await expect(page.getByRole("heading", { name: "No questions match these filters" })).toBeVisible();
});
