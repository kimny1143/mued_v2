import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock environment variables
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'test_pk_123';
process.env.CLERK_SECRET_KEY = 'test_sk_123';
process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.STRIPE_SECRET_KEY = 'sk_test_123';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
process.env.OPENAI_API_KEY = 'sk-test-123';

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

// Mock Locale Context
vi.mock('@/lib/i18n/locale-context', () => ({
  LocaleProvider: vi.fn(({ children }: { children: any }) => children),
  useLocale: vi.fn(() => ({
    locale: 'en',
    setLocale: vi.fn(),
    t: vi.fn((key: string) => key),
  })),
}));

// Mock Clerk (Client-side)
vi.mock('@clerk/nextjs', () => ({
  auth: () => ({
    userId: 'test_user_123',
    sessionId: 'test_session_123',
    getToken: vi.fn().mockResolvedValue('test_token'),
  }),
  currentUser: vi.fn().mockResolvedValue({
    id: 'test_user_123',
    username: 'testuser',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
  }),
  useAuth: vi.fn(() => ({
    isLoaded: true,
    isSignedIn: true,
    userId: 'test_user_123',
    sessionId: 'test_session_123',
    actor: null,
    orgId: null,
    orgRole: null,
    orgSlug: null,
    has: vi.fn().mockReturnValue(true),
    getToken: vi.fn().mockResolvedValue('test_token'),
    signOut: vi.fn(),
  })),
  useUser: vi.fn(() => ({
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: 'test_user_123',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      primaryEmailAddress: { emailAddress: 'test@example.com' },
      imageUrl: 'https://example.com/avatar.jpg',
    },
  })),
  useSession: vi.fn(() => ({
    isLoaded: true,
    isSignedIn: true,
    session: {
      id: 'test_session_123',
      status: 'active',
      lastActiveAt: new Date(),
      expireAt: new Date(Date.now() + 3600000),
    },
  })),
  SignIn: vi.fn(() => null),
  SignUp: vi.fn(() => null),
  UserButton: vi.fn(() => null),
  ClerkProvider: vi.fn(({ children }: { children: any }) => children),
}));

// Mock Clerk (Server-side)
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => Promise.resolve({
    userId: 'test_user_123',
    sessionId: 'test_session_123',
    getToken: vi.fn().mockResolvedValue('test_token'),
  })),
  currentUser: vi.fn().mockResolvedValue({
    id: 'test_user_123',
    username: 'testuser',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
  }),
}));

// Global test utilities
afterEach(() => {
  cleanup(); // Clean up DOM between tests
  vi.clearAllMocks();
});

// Custom matchers
declare global {
  namespace Vi {
    interface Assertion {
      toBeWithinRange(floor: number, ceiling: number): void;
    }
  }
}

// Mock fetch globally
global.fetch = vi.fn();

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  takeRecords: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));