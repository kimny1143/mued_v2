import { Page, expect } from "@playwright/test";

export interface AuthCredentials {
  username: string;
  password: string;
}

export class AuthHelper {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Login with Clerk authentication
   * Handles both username and email-based login with improved selectors
   */
  async login(credentials: AuthCredentials): Promise<void> {
    await this.page.goto("/sign-in");

    // Wait for Clerk component to fully load
    await this.page.waitForSelector('[data-clerk-component="SignIn"]', {
      timeout: 15000,
      state: "visible",
    });

    // Additional wait for Clerk to initialize
    await this.page.waitForTimeout(2000);

    // Try different selector strategies for the identifier field
    const identifierSelectors = [
      'input[name="identifier"]',
      'input[type="text"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="username" i]',
      'input[aria-label*="email" i]',
      'input[aria-label*="username" i]',
    ];

    let identifierField = null;
    for (const selector of identifierSelectors) {
      const element = this.page.locator(selector).first();
      if ((await element.count()) > 0) {
        identifierField = element;
        break;
      }
    }

    if (!identifierField) {
      throw new Error("Could not find identifier field for login");
    }

    await identifierField.fill(credentials.username);

    // Find and click continue button
    const continueButton = this.page
      .locator('button:has-text("Continue"), button:has-text("Next")')
      .first();
    await continueButton.click();

    // Wait for password field to appear
    await this.page.waitForTimeout(2000);

    // Fill password with multiple selector strategies
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[aria-label*="password" i]',
    ];

    let passwordField = null;
    for (const selector of passwordSelectors) {
      const element = this.page.locator(selector).first();
      if ((await element.count()) > 0) {
        passwordField = element;
        break;
      }
    }

    if (!passwordField) {
      throw new Error("Could not find password field");
    }

    await passwordField.fill(credentials.password);

    // Click sign in button
    const signInButton = this.page
      .locator(
        'button:has-text("Continue"), button:has-text("Sign in"), button:has-text("Submit")'
      )
      .first();
    await signInButton.click();

    // Wait for navigation to dashboard
    await this.page.waitForURL("**/dashboard", {
      timeout: 15000,
      waitUntil: "networkidle",
    });

    // Verify successful login
    await expect(this.page).toHaveURL(/.*\/dashboard/);
  }

  /**
   * Logout from the application
   */
  async logout(): Promise<void> {
    // Look for user button or menu
    const userButton = this.page.locator(
      '[data-testid="user-button"], button[aria-label*="user" i], button:has-text("Sign out")'
    );

    if ((await userButton.count()) > 0) {
      await userButton.first().click();
      // Look for sign out option
      const signOutButton = this.page.locator('button:has-text("Sign out")');
      if ((await signOutButton.count()) > 0) {
        await signOutButton.click();
        await this.page.waitForURL("**/", { timeout: 10000 });
      }
    }
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      const url = this.page.url();
      return url.includes("/dashboard");
    } catch {
      return false;
    }
  }

  /**
   * Setup mock authentication for testing (bypasses Clerk)
   * This should only be used in test environments
   */
  async setupMockAuth(): Promise<void> {
    // Set mock session in localStorage or cookies
    await this.page.evaluate(() => {
      // Mock Clerk session
      window.localStorage.setItem(
        "__clerk_session",
        JSON.stringify({
          userId: "test_user_123",
          sessionId: "test_session_123",
          isSignedIn: true,
        })
      );
    });

    // Set necessary cookies
    await this.page.context().addCookies([
      {
        name: "__session",
        value: "test_session_token",
        domain: "localhost",
        path: "/",
      },
    ]);
  }
}

// Test user credentials (should be in environment variables in production)
export const TEST_USERS = {
  student: {
    username: "test_student",
    password: "TestPassword123!",
  },
  instructor: {
    username: "test_instructor",
    password: "TestPassword123!",
  },
};