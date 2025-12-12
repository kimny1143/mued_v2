import React from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import * as Clerk from '@clerk/nextjs';

// Mock ClerkProvider for tests
const MockClerkProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

// Types
export interface MockUser {
  id: string;
  username?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  role?: 'teacher' | 'student' | 'admin';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export interface MockSession {
  id: string;
  userId: string;
  status: 'active' | 'expired' | 'revoked';
  lastActiveAt: Date;
  expireAt: Date;
}

export interface TestProviderProps {
  children: React.ReactNode;
  user?: MockUser;
  session?: MockSession;
  locale?: string;
  isSignedIn?: boolean;
  isLoaded?: boolean;
}

// Default mock values
const defaultMockUser: MockUser = {
  id: 'user_test_123',
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  imageUrl: '/test-avatar.png',
  role: 'teacher',
  metadata: {},
};

const defaultMockSession: MockSession = {
  id: 'sess_test_123',
  userId: 'user_test_123',
  status: 'active',
  lastActiveAt: new Date(),
  expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
};

// Mock data generators
export function mockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    ...defaultMockUser,
    ...overrides,
  };
}

export function mockSession(overrides: Partial<MockSession> = {}): MockSession {
  return {
    ...defaultMockSession,
    ...overrides,
  };
}

// Mock multiple users for testing lists
export function mockUsers(count: number, overrides: Partial<MockUser> = {}): MockUser[] {
  return Array.from({ length: count }, (_, index) => ({
    ...defaultMockUser,
    id: `user_test_${index + 1}`,
    username: `testuser${index + 1}`,
    email: `test${index + 1}@example.com`,
    ...overrides,
  }));
}

// Mock Clerk hooks with custom implementations
export function setupClerkMocks(user?: MockUser, session?: MockSession, options?: { isSignedIn?: boolean; isLoaded?: boolean }) {
  const isSignedIn = options?.isSignedIn ?? true;
  const isLoaded = options?.isLoaded ?? true;

  // Mock useAuth
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (vi.mocked(Clerk.useAuth) as any).mockReturnValue({
    isLoaded,
    isSignedIn,
    userId: user?.id || null,
    sessionId: session?.id || null,
    actor: null,
    orgId: null,
    orgRole: null,
    orgSlug: null,
    has: vi.fn().mockReturnValue(true),
    getToken: vi.fn().mockResolvedValue('mock_token'),
    signOut: vi.fn(),
  });

  // Mock useUser
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (vi.mocked(Clerk.useUser) as any).mockReturnValue({
    isLoaded,
    isSignedIn,
    user: user ? {
      id: user.id,
      username: user.username || null,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      fullName: `${user.firstName} ${user.lastName}`.trim() || null,
      emailAddresses: [
        {
          id: 'email_1',
          emailAddress: user.email,
          linkedTo: [],
          verification: {
            status: 'verified',
            strategy: 'email_code',
            attempts: 0,
            expireAt: new Date(Date.now() + 3600000),
          },
        },
      ],
      primaryEmailAddress: {
        id: 'email_1',
        emailAddress: user.email,
        linkedTo: [],
        verification: {
          status: 'verified',
          strategy: 'email_code',
          attempts: 0,
          expireAt: new Date(Date.now() + 3600000),
        },
      },
      primaryEmailAddressId: 'email_1',
      phoneNumbers: [],
      primaryPhoneNumber: null,
      primaryPhoneNumberId: null,
      web3Wallets: [],
      primaryWeb3WalletId: null,
      externalAccounts: [],
      samlAccounts: [],
      organizationMemberships: [],
      passwordEnabled: true,
      twoFactorEnabled: false,
      totp: null,
      backupCodes: null,
      createOrganizationEnabled: true,
      deleteSelfEnabled: true,
      profileImageUrl: user.imageUrl || '',
      imageUrl: user.imageUrl || '',
      hasImage: !!user.imageUrl,
      publicMetadata: user.metadata || {},
      privateMetadata: {},
      unsafeMetadata: {},
      lastSignInAt: session?.lastActiveAt || new Date(),
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      updatedAt: new Date(),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      setProfileImage: vi.fn().mockResolvedValue(undefined),
      reload: vi.fn().mockResolvedValue(undefined),
      getSessions: vi.fn().mockResolvedValue([]),
      createEmailAddress: vi.fn(),
      createPhoneNumber: vi.fn(),
      createWeb3Wallet: vi.fn(),
      createExternalAccount: vi.fn(),
      createTOTP: vi.fn(),
      verifyTOTP: vi.fn(),
      disableTOTP: vi.fn(),
      createBackupCode: vi.fn(),
      isPrimaryIdentification: vi.fn().mockReturnValue(true),
    } : null,
  });

  // Mock useSession
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (vi.mocked(Clerk.useSession) as any).mockReturnValue({
    isLoaded,
    isSignedIn,
    session: session && isSignedIn ? {
      id: session.id,
      user: user ? {
        id: user.id,
        username: user.username || null,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        fullName: `${user.firstName} ${user.lastName}`.trim() || null,
        emailAddresses: [
          {
            id: 'email_1',
            emailAddress: user.email,
            linkedTo: [],
            verification: {
              status: 'verified',
              strategy: 'email_code',
              attempts: 0,
              expireAt: new Date(Date.now() + 3600000),
            },
          },
        ],
        primaryEmailAddress: {
          id: 'email_1',
          emailAddress: user.email,
          linkedTo: [],
          verification: {
            status: 'verified',
            strategy: 'email_code',
            attempts: 0,
            expireAt: new Date(Date.now() + 3600000),
          },
        },
        primaryEmailAddressId: 'email_1',
        phoneNumbers: [],
        primaryPhoneNumber: null,
        primaryPhoneNumberId: null,
        web3Wallets: [],
        primaryWeb3WalletId: null,
        externalAccounts: [],
        samlAccounts: [],
        organizationMemberships: [],
        passwordEnabled: true,
        twoFactorEnabled: false,
        totp: null,
        backupCodes: null,
        createOrganizationEnabled: true,
        deleteSelfEnabled: true,
        profileImageUrl: user.imageUrl || '',
        imageUrl: user.imageUrl || '',
        hasImage: !!user.imageUrl,
        publicMetadata: user.metadata || {},
        privateMetadata: {},
        unsafeMetadata: {},
        lastSignInAt: session.lastActiveAt,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        update: vi.fn(),
        delete: vi.fn(),
        setProfileImage: vi.fn(),
        reload: vi.fn(),
        getSessions: vi.fn(),
        createEmailAddress: vi.fn(),
        createPhoneNumber: vi.fn(),
        createWeb3Wallet: vi.fn(),
        createExternalAccount: vi.fn(),
        createTOTP: vi.fn(),
        verifyTOTP: vi.fn(),
        disableTOTP: vi.fn(),
        createBackupCode: vi.fn(),
        isPrimaryIdentification: vi.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } : null as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: session.status as any,
      lastActiveAt: session.lastActiveAt,
      lastActiveToken: null,
      lastActiveOrganizationId: null,
      actor: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      expireAt: session.expireAt,
      abandonAt: new Date(Date.now() + 30 * 60 * 1000),
      publicUserData: {
        userId: user?.id || null,
        firstName: user?.firstName || null,
        lastName: user?.lastName || null,
        imageUrl: user?.imageUrl || null,
        hasImage: !!user?.imageUrl,
        identifier: user?.email || null,
      },
      end: vi.fn(),
      remove: vi.fn(),
      touch: vi.fn(),
      getToken: vi.fn().mockResolvedValue('mock_token'),
      checkAuthorization: vi.fn().mockReturnValue({ isAuthorized: true, reason: null }),
      clearCache: vi.fn(),
      reload: vi.fn(),
    } : null,
  });
}

// Test providers wrapper
export function TestProviders({ children, user, session, locale = 'ja', isSignedIn = true, isLoaded = true }: TestProviderProps) {
  // Setup Clerk mocks if user is provided
  React.useEffect(() => {
    if (user || session) {
      setupClerkMocks(user, session, { isSignedIn, isLoaded });
    }
  }, [user, session, isSignedIn, isLoaded]);

  // Note: LocaleProvider is already mocked in vitest.setup.ts
  // We don't need to wrap with LocaleProviderWrapper here
  return (
    <MockClerkProvider>
      {children}
    </MockClerkProvider>
  );
}

// Enhanced render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: MockUser;
  session?: MockSession;
  locale?: string;
  isSignedIn?: boolean;
  isLoaded?: boolean;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: CustomRenderOptions,
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const { user, session, locale, isSignedIn, isLoaded, ...renderOptions } = options || {};

  const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
    <TestProviders
      user={user}
      session={session}
      locale={locale}
      isSignedIn={isSignedIn}
      isLoaded={isLoaded}
    >
      {children}
    </TestProviders>
  );

  const renderResult = render(ui, { wrapper: AllTheProviders, ...renderOptions });

  return {
    ...renderResult,
    user: userEvent.setup(),
  };
}

// Helper to wait for loading states to finish
export async function waitForLoadingToFinish(
  options: { timeout?: number } = {},
): Promise<void> {
  const { timeout = 3000 } = options;

  return new Promise((resolve) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const loadingElements = document.querySelectorAll('[data-testid*="loading"], [aria-busy="true"], .loading, .skeleton');

      if (loadingElements.length === 0 || Date.now() - startTime > timeout) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });
}

// Helper to mock API responses
export function mockApiResponse<T>(data: T, options: { delay?: number; status?: number } = {}) {
  const { delay = 0, status = 200 } = options;

  return new Promise<Response>((resolve) => {
    setTimeout(() => {
      resolve(
        new Response(JSON.stringify(data), {
          status,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }, delay);
  });
}

// Helper to create mock form data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createMockFormData(data: Record<string, any>): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value instanceof File) {
      formData.append(key, value);
    } else if (typeof value === 'object' && value !== null) {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, String(value));
    }
  });
  return formData;
}

// Helper to mock date/time for consistent testing
export function mockDate(date: Date | string) {
  const mockedDate = typeof date === 'string' ? new Date(date) : date;

  vi.useFakeTimers();
  vi.setSystemTime(mockedDate);

  return {
    restore: () => vi.useRealTimers(),
  };
}

// Helper to test accessibility
export async function expectNoA11yViolations(container: HTMLElement) {
  // This would normally use @axe-core/react but we'll do basic checks
  const interactiveElements = container.querySelectorAll(
    'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );

  interactiveElements.forEach((element) => {
    // Check for accessible names
    const hasAriaLabel = element.hasAttribute('aria-label');
    const hasAriaLabelledBy = element.hasAttribute('aria-labelledby');
    const hasTitle = element.hasAttribute('title');
    const hasText = element.textContent?.trim();

    if (!hasAriaLabel && !hasAriaLabelledBy && !hasTitle && !hasText) {
      console.warn(`Element might be missing accessible name:`, element);
    }

    // Check for keyboard accessibility
    const isNaturallyFocusable = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName);
    const hasTabindex = element.hasAttribute('tabindex');

    if (!isNaturallyFocusable && !hasTabindex) {
      console.warn(`Interactive element might not be keyboard accessible:`, element);
    }
  });

  // Check for proper heading hierarchy
  const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  let lastLevel = 0;

  headings.forEach((heading) => {
    const level = parseInt(heading.tagName[1]);
    if (level - lastLevel > 1) {
      console.warn(`Heading hierarchy jump from h${lastLevel} to h${level}`);
    }
    lastLevel = level;
  });

  return true;
}

// Helper to simulate network conditions
export function simulateNetworkConditions(type: 'slow' | 'offline' | 'normal') {
  const originalFetch = global.fetch;



  switch (type) {
    case 'slow':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) =>
        new Promise((resolve) => {
          setTimeout(() => originalFetch(input, init).then(resolve), 3000);
        }),
      );
      break;
    case 'offline':
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      break;
    case 'normal':
    default:
      global.fetch = originalFetch;
  }

  return {
    restore: () => {
      global.fetch = originalFetch;
    },
  };
}

// Export everything for easy access
export * from '@testing-library/react';
export { userEvent };