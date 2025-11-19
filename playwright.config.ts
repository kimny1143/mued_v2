import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, ".env.test") });

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts", // Only match .spec.ts files, exclude .test.ts (Vitest)
  timeout: process.env.CI ? 30 * 1000 : 30 * 1000, // 30s per test (reduced from 60s)
  expect: {
    timeout: process.env.CI ? 10000 : 10000, // 10s for assertions
  },
  fullyParallel: true, // ✅ FIXED: Enable parallel execution
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0, // ✅ FIXED: Reduced retries (1 retry in CI, 0 locally)
  workers: process.env.CI ? 4 : 2, // ✅ FIXED: 4 workers in CI, 2 locally (parallel execution)
  reporter: process.env.CI
    ? [
        ["list"],
        ["json", { outputFile: "test-results.json" }],
        ["junit", { outputFile: "test-results.xml" }],
      ]
    : [
        ["html"],
        ["list"],
      ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: process.env.CI ? "on-first-retry" : "retain-on-failure",
    // Improved timeouts for CI environment
    navigationTimeout: process.env.CI ? 45000 : 30000,
    actionTimeout: process.env.CI ? 20000 : 15000,
    // Additional CI-specific settings
    ...(process.env.CI && {
      // Disable animations in CI for stability
      launchOptions: {
        args: ['--disable-animations', '--force-color-profile=srgb'],
      },
      // Wait for network to be idle
      waitForLoadState: 'networkidle',
    }),
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
    reuseExistingServer: !process.env.CI, // Reuse existing server in local development, start fresh in CI
    timeout: 120 * 1000, // ✅ FIXED: Reduced to 2 minutes (was 3 minutes)
    stdout: "ignore",
    stderr: "ignore",
    env: {
      NEXT_PUBLIC_E2E_TEST_MODE: 'true', // Enable E2E test mode to bypass Clerk auth
    },
  },
});