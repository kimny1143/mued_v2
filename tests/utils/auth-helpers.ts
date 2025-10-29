/**
 * Authentication Test Helpers
 *
 * Utilities for mocking Clerk authentication in tests.
 */

import { vi } from 'vitest';

/**
 * Mock user types
 */
export interface MockUser {
  id: string;
  clerkId: string;
  email: string;
  role: 'student' | 'mentor' | 'admin';
  name?: string;
}

/**
 * Predefined test users
 */
export const testUsers: Record<string, MockUser> = {
  student: {
    id: 'test-student-uuid',
    clerkId: 'test_student_123',
    email: 'student@test.example.com',
    role: 'student',
    name: 'Test Student',
  },
  mentor: {
    id: 'test-mentor-uuid',
    clerkId: 'test_mentor_123',
    email: 'mentor@test.example.com',
    role: 'mentor',
    name: 'Test Mentor',
  },
  admin: {
    id: 'test-admin-uuid',
    clerkId: 'admin_user_123',
    email: 'admin@test.example.com',
    role: 'admin',
    name: 'Admin User',
  },
};

/**
 * Mock Clerk auth() function
 */
export function mockClerkAuth(user: MockUser | null) {
  return vi.fn().mockResolvedValue({
    userId: user?.clerkId || null,
    sessionId: user ? `session_${user.clerkId}` : null,
    getToken: vi.fn().mockResolvedValue(user ? 'mock_token' : null),
  });
}

/**
 * Mock authenticated student
 */
export function mockAuthStudent() {
  return mockClerkAuth(testUsers.student);
}

/**
 * Mock authenticated mentor
 */
export function mockAuthMentor() {
  return mockClerkAuth(testUsers.mentor);
}

/**
 * Mock authenticated admin
 */
export function mockAuthAdmin() {
  return mockClerkAuth(testUsers.admin);
}

/**
 * Mock unauthenticated user
 */
export function mockAuthUnauthenticated() {
  return mockClerkAuth(null);
}

/**
 * Mock Clerk currentUser() function
 */
export function mockCurrentUser(user: MockUser | null) {
  return vi.fn().mockResolvedValue(
    user
      ? {
          id: user.clerkId,
          emailAddresses: [{ emailAddress: user.email }],
          firstName: user.name?.split(' ')[0],
          lastName: user.name?.split(' ')[1],
          publicMetadata: { role: user.role },
        }
      : null
  );
}

/**
 * Setup auth mocks for testing
 */
export function setupAuthMocks(userType: keyof typeof testUsers | null = null) {
  const user = userType ? testUsers[userType] : null;

  // Mock @clerk/nextjs/server
  vi.mock('@clerk/nextjs/server', () => ({
    auth: mockClerkAuth(user),
    currentUser: mockCurrentUser(user),
  }));

  return user;
}

/**
 * Create mock auth token
 */
export function createMockToken(user: MockUser): string {
  return `mock_token_${user.clerkId}_${Date.now()}`;
}

/**
 * Validate auth token format
 */
export function isValidMockToken(token: string): boolean {
  return token.startsWith('mock_token_');
}

/**
 * Auth test utilities
 */
export const authTestUtils = {
  /**
   * Assert user is authenticated
   */
  assertAuthenticated(authResult: any): void {
    if (!authResult || !authResult.userId) {
      throw new Error('Expected user to be authenticated');
    }
  },

  /**
   * Assert user is not authenticated
   */
  assertUnauthenticated(authResult: any): void {
    if (authResult && authResult.userId) {
      throw new Error('Expected user to be unauthenticated');
    }
  },

  /**
   * Assert user has role
   */
  assertHasRole(user: MockUser, expectedRole: string): void {
    if (user.role !== expectedRole) {
      throw new Error(`Expected role ${expectedRole}, got ${user.role}`);
    }
  },

  /**
   * Get user by Clerk ID
   */
  getUserByClerkId(clerkId: string): MockUser | undefined {
    return Object.values(testUsers).find(u => u.clerkId === clerkId);
  },
};

/**
 * Mock Clerk webhook payload
 */
export function createMockWebhookPayload(
  type: 'user.created' | 'user.updated' | 'user.deleted',
  user: MockUser
) {
  return {
    type,
    data: {
      id: user.clerkId,
      email_addresses: [{ email_address: user.email }],
      first_name: user.name?.split(' ')[0],
      last_name: user.name?.split(' ')[1],
      public_metadata: { role: user.role },
    },
  };
}

/**
 * Auth request headers helper
 */
export function createAuthHeaders(user: MockUser | null): Record<string, string> {
  if (!user) {
    return {};
  }

  return {
    Authorization: `Bearer ${createMockToken(user)}`,
    'X-User-Id': user.clerkId,
  };
}

/**
 * Simulate Clerk session
 */
export class MockClerkSession {
  constructor(public user: MockUser | null = null) {}

  isAuthenticated(): boolean {
    return this.user !== null;
  }

  getUserId(): string | null {
    return this.user?.clerkId || null;
  }

  getToken(): string | null {
    return this.user ? createMockToken(this.user) : null;
  }

  async signOut(): Promise<void> {
    this.user = null;
  }

  async signIn(user: MockUser): Promise<void> {
    this.user = user;
  }
}
