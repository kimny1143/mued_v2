/**
 * Admin Middleware Unit Tests
 *
 * Tests isAdmin() — checks Clerk publicMetadata.role === 'admin'.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ========================================
// Mocks
// ========================================

const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(),
}));

import { clerkClient } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/middleware/admin';

// ========================================
// Tests
// ========================================

describe('isAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clerkClient).mockResolvedValue({
      users: { getUser: mockGetUser },
    } as any);
  });

  it('returns true when user has admin role', async () => {
    mockGetUser.mockResolvedValue({ publicMetadata: { role: 'admin' } });
    expect(await isAdmin('user_abc')).toBe(true);
  });

  it('returns false when user has no role', async () => {
    mockGetUser.mockResolvedValue({ publicMetadata: {} });
    expect(await isAdmin('user_abc')).toBe(false);
  });

  it('returns false when user has non-admin role', async () => {
    mockGetUser.mockResolvedValue({ publicMetadata: { role: 'user' } });
    expect(await isAdmin('user_abc')).toBe(false);
  });

  it('returns false when publicMetadata is undefined', async () => {
    mockGetUser.mockResolvedValue({ publicMetadata: undefined });
    expect(await isAdmin('user_abc')).toBe(false);
  });

  it('returns false when userId is null', async () => {
    expect(await isAdmin(null)).toBe(false);
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('returns false when userId is undefined', async () => {
    expect(await isAdmin(undefined)).toBe(false);
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('returns false when clerkClient throws (e.g. Clerk unavailable)', async () => {
    vi.mocked(clerkClient).mockRejectedValue(new Error('Clerk unavailable'));
    expect(await isAdmin('user_abc')).toBe(false);
  });
});
