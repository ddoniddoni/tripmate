import { defineConfig } from "@playwright/test";

const port = 3100;
const baseURL = `http://localhost:${port}`;
const runAuthenticatedE2E =
  process.env.E2E_AUTHENTICATED === "1" && Boolean(process.env.E2E_TEST_EMAIL?.trim());

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  outputDir: "test-results",
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  testDir: "./tests/e2e",
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    env: {
      ...process.env,
      NEXT_PUBLIC_APP_URL: baseURL,
      // The default suite only verifies unauthenticated UI. Explicit placeholder values
      // prevent it from reading real Supabase credentials or calling providers. The opt-in
      // authenticated suite deliberately uses the local Supabase development configuration.
      ...(runAuthenticatedE2E
        ? {}
        : {
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_e2e_test",
            NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
          }),
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: baseURL,
  },
  workers: process.env.CI ? 1 : undefined,
});
