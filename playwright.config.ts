import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";
const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("Browser tests require TEST_DATABASE_URL pointing to a disposable database ending in _test.");
}
export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: false, reporter: "list",
  use: { baseURL: "http://127.0.0.1:3000", trace: "off", screenshot: "off" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://127.0.0.1:3000", reuseExistingServer: false, timeout: 120000,
    env: {
      DATABASE_URL: databaseUrl,
      NEXTAUTH_SECRET: "overleet-browser-test-secret",
      GITHUB_ID: "browser-test-client", GITHUB_SECRET: "browser-test-client-secret",
      NEXTAUTH_URL: "http://127.0.0.1:3000"
    }
  }
});
