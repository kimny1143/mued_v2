/**
 * Sales-path guard G2 (kimny 2026-10-04「仕組みを作ってくれ」・Chief brief `brief-sales-path-guard-20261004.md`):
 * the main CTAs, measured in a real browser at phone width. CI starts the production build (`next start`)
 * built with the production-shaped flags; locally, point SALES_PATH_BASE_URL at a running `next dev`.
 */
import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.SALES_PATH_PORT ?? 3100);
const baseURL = process.env.SALES_PATH_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "e2e/sales-path",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  retries: 0, // ★A guard that passes on the second try is not a guard.
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    ...devices["Desktop Chrome"],
    viewport: { width: 390, height: 844 },
    trace: "off",
    screenshot: "only-on-failure",
  },
  webServer: process.env.SALES_PATH_BASE_URL
    ? undefined
    : {
        command: `npx next start -p ${port}`,
        url: `${baseURL}/en/muedsat`,
        timeout: 120_000,
        reuseExistingServer: false,
        stdout: "ignore",
        stderr: "pipe",
      },
});
