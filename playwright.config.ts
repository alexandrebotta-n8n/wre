import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  webServer: {
    command: "next dev -p 3001",
    url: "http://localhost:3001",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
