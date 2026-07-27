import { defineConfig } from "@playwright/test";
import { LOCAL_ENV } from "./e2e/local-env";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  retries: process.env.CI ? 1 : 0,
  // Local dev-server compiles routes on demand; unbounded parallel spec
  // files can starve it on a loaded machine (observed flaky multi-minute
  // navigations). CI keeps Playwright's default.
  workers: process.env.CI ? undefined : 4,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm --filter @aivs/studio-web dev",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { ...(process.env as Record<string, string>), ...LOCAL_ENV },
  },
});
