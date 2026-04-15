/**
 * Playwright Recording Config
 *
 * Used for generating onboarding/promo video recordings via:
 *   npx playwright test --config=playwright.recording.config.ts
 *
 * Videos are saved to recordings/onboarding/ at 1920x1080.
 * Intended output: 30-60s screen recordings for SNS/Remotion compositing.
 */

import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.test') });

export default defineConfig({
  testDir: '.',
  testMatch: ['e2e/onboarding-recording.spec.ts'],
  timeout: 120 * 1000, // 2 min — includes intentional pauses
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off',
    screenshot: 'off',
    // Always record video at 1080p
    video: {
      mode: 'on',
      size: { width: 1920, height: 1080 },
    },
    launchOptions: {
      args: ['--force-color-profile=srgb'],
    },
    // Generous timeouts for viewer-friendly pacing
    navigationTimeout: 30000,
    actionTimeout: 15000,
  },
  projects: [
    {
      name: 'recording-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      outputDir: 'recordings/onboarding',
    },
  ],
  // Do NOT start a dev server — run `npm run dev` separately before recording
});
