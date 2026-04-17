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
  currentUser: vi.fn(),
}));

import { currentUser } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/middleware/admin';

// ========================================
// Tests
// ========================================

describe('isAdmin', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when user has admin role', async () => {
    vi.mocked(currentUser).mockResolvedValue({
      publicMetadata: { role: 'admin' },
    } as any);

    expect(await isAdmin()).toBe(true);
  });

  it('returns false when user has no role', async () => {
    vi.mocked(currentUser).mockResolvedValue({
      publicMetadata: {},
    } as any);

    expect(await isAdmin()).toBe(false);
  });

  it('returns false when user has non-admin role', async () => {
    vi.mocked(currentUser).mockResolvedValue({
      publicMetadata: { role: 'user' },
    } as any);

    expect(await isAdmin()).toBe(false);
  });

  it('returns false when publicMetadata is undefined', async () => {
    vi.mocked(currentUser).mockResolvedValue({
      publicMetadata: undefined,
    } as any);

    expect(await isAdmin()).toBe(false);
  });

  it('returns false when not authenticated (currentUser returns null)', async () => {
    vi.mocked(currentUser).mockResolvedValue(null);

    expect(await isAdmin()).toBe(false);
  });

  it('returns false when currentUser throws (e.g. Clerk unavailable)', async () => {
    vi.mocked(currentUser).mockRejectedValue(new Error('Clerk unavailable'));

    expect(await isAdmin()).toBe(false);
  });
});
