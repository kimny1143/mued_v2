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
   * Uses mock authentication to bypass OAuth for testing
   */
  async login(credentials: AuthCredentials): Promise<void> {
    console.log('Using mock authentication for E2E tests (bypassing Clerk OAuth)');

    // Set mock Clerk session directly in the browser
    await this.page.goto('/');

    // Mock Clerk session in localStorage and cookies
    await this.page.evaluate(() => {
      // Set mock session data that Clerk expects
      const mockSession = {
        id: 'sess_test123',
        status: 'active',
        expireAt: Date.now() + 3600000, // 1 hour from now
        abandonAt: Date.now() + 7200000,
        lastActiveAt: Date.now(),
        userId: 'user_test123',
        actor: null,
        publicUserData: {
          userId: 'user_test123',
          identifier: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
      };

      // Clerk stores session in __clerk_db_jwt
      localStorage.setItem('__clerk_db_jwt', JSON.stringify({
        token: 'mock_jwt_token',
        expiresAt: Date.now() + 3600000,
      }));

      // Additional session storage
      localStorage.setItem('__session', JSON.stringify(mockSession));
    });

    // Add session cookie
    await this.page.context().addCookies([
      {
        name: '__session',
        value: 'mock_session_token_for_testing',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
      {
        name: '__client_uat',
        value: String(Date.now()),
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Navigate to dashboard - should be authenticated now
    await this.page.goto('/dashboard');

    // Wait for dashboard to load
    await this.page.waitForURL('**/dashboard', {
      timeout: 15000,
    });

    // Verify successful mock login
    await expect(this.page).toHaveURL(/.*\/dashboard/);

    console.log('Mock authentication successful');
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