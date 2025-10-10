import { test as setup } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Go to sign-in page
  await page.goto('/sign-in');

  // Wait for Clerk to load
  await page.waitForLoadState('networkidle');

  // For now, we'll use a different approach - set test mode
  // In production, you would:
  // 1. Click Google OAuth button
  // 2. Enter credentials
  // 3. Complete OAuth flow
  // 4. Save session state

  // For testing, we'll bypass by modifying middleware behavior
  console.log('Auth setup - skipping for now, will use test mode');

  // Save signed-in state to 'storageState'
  await page.context().storageState({ path: authFile });
});
