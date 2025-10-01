import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts", // Only match .spec.ts files, exclude .test.ts (Vitest)
  timeout: 30 * 1000,
  expect: {
    timeout: 10000, // Increased for better stability
  },
  fullyParallel: false, // Run tests sequentially for better stability with auth
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Add retry for local development
  workers: process.env.CI ? 1 : 1, // Single worker for auth consistency
  reporter: [
    ["html"],
    ["list"],
    ["json", { outputFile: "test-results.json" }],
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Improved timeouts for navigation
    navigationTimeout: 30000,
    actionTimeout: 15000,
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true, // Always reuse existing server to avoid conflicts
    timeout: 120 * 1000,
    stdout: "ignore",
    stderr: "ignore",
  },
});