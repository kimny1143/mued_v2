import { vi, afterEach } from 'vitest';
import './custom-matchers';

// Set up environment variables for integration tests
// Don't mock OpenAI_API_KEY as it needs to be a real key from CI secrets
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'test_pk_123';
process.env.CLERK_SECRET_KEY = 'test_sk_123';

// Use testcontainers DATABASE_URL if available (set by globalSetup)
// Otherwise use a mock URL for unit tests
if (!process.env.DATABASE_URL && process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
} else if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';
}

process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.STRIPE_SECRET_KEY = 'sk_test_123';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';

// If OPENAI_API_KEY is not set by CI, set a dummy value
// This will be overridden by the CI environment variable
if (!process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = 'sk-test-dummy-key';
}

// DO NOT mock fetch for integration tests - we need the real implementation
// Node.js 18+ has native fetch support

// Mock Clerk for integration tests (if needed)
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

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});