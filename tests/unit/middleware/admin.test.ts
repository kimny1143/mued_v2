/**
 * Admin Middleware Unit Tests
 *
 * Tests isAdmin() — checks Clerk publicMetadata.role === 'admin'.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ========================================
// Mocks
// ========================================

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/middleware/admin';

// ========================================
// Tests
// ========================================

describe('isAdmin', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when user has admin role', async () => {
    vi.mocked(auth).mockResolvedValue({
      sessionClaims: {
        metadata: { role: 'admin' },
      },
    } as any);

    expect(await isAdmin()).toBe(true);
  });

  it('returns false when user has no role', async () => {
    vi.mocked(auth).mockResolvedValue({
      sessionClaims: {
        metadata: {},
      },
    } as any);

    expect(await isAdmin()).toBe(false);
  });

  it('returns false when user has non-admin role', async () => {
    vi.mocked(auth).mockResolvedValue({
      sessionClaims: {
        metadata: { role: 'user' },
      },
    } as any);

    expect(await isAdmin()).toBe(false);
  });

  it('returns false when metadata is undefined', async () => {
    vi.mocked(auth).mockResolvedValue({
      sessionClaims: {
        metadata: undefined,
      },
    } as any);

    expect(await isAdmin()).toBe(false);
  });

  it('returns false when sessionClaims is null (not authenticated)', async () => {
    vi.mocked(auth).mockResolvedValue({
      sessionClaims: null,
    } as any);

    expect(await isAdmin()).toBe(false);
  });

  it('returns false when auth throws (e.g. Clerk unavailable)', async () => {
    vi.mocked(auth).mockRejectedValue(new Error('Clerk unavailable'));

    expect(await isAdmin()).toBe(false);
  });
});
