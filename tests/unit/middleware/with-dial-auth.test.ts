/**
 * MUEDial Auth Middleware Unit Tests
 *
 * Tests withDialAuth — dual auth supporting Clerk users and guest tokens.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ========================================
// Mocks
// ========================================

vi.mock('@/lib/middleware/with-auth', () => ({
  resolveClerkUserId: vi.fn(),
}));

const mockFindFirst = vi.fn();

vi.mock('@/db', () => ({
  db: {
    query: {
      dialSessions: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
    },
  },
}));

vi.mock('@/db/schema', () => ({
  dialSessions: {
    guestToken: 'guest_token',
    guestTokenExpiresAt: 'guest_token_expires_at',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ a, b })),
  and: vi.fn((...args) => args),
  gt: vi.fn((a, b) => ({ a, b })),
}));

vi.mock('@/lib/api-response', () => ({
  apiUnauthorized: vi.fn((msg?: string) =>
    NextResponse.json(
      { error: msg || 'Unauthorized' },
      { status: 401 }
    )
  ),
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { withDialAuth, type DialAuthContext } from '@/lib/middleware/with-dial-auth';
import { resolveClerkUserId } from '@/lib/middleware/with-auth';

// ========================================
// Helpers
// ========================================

function makeRequest(
  url: string = 'http://localhost:3000/api/dial/chat',
  headers?: Record<string, string>
): NextRequest {
  return new NextRequest(url, { headers });
}

// ========================================
// Tests
// ========================================

describe('withDialAuth', () => {
  let handlerSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    handlerSpy = vi.fn().mockResolvedValue(
      NextResponse.json({ ok: true })
    );
  });

  describe('Clerk authentication', () => {
    it('calls handler with userId when Clerk auth succeeds', async () => {
      vi.mocked(resolveClerkUserId).mockResolvedValue('clerk_123');

      const wrapped = withDialAuth(handlerSpy);
      const request = makeRequest();
      await wrapped(request);

      expect(handlerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'clerk_123',
          guestToken: null,
          isGuest: false,
        })
      );
    });

    it('passes request object to handler', async () => {
      vi.mocked(resolveClerkUserId).mockResolvedValue('clerk_123');

      const wrapped = withDialAuth(handlerSpy);
      const request = makeRequest();
      await wrapped(request);

      const ctx = handlerSpy.mock.calls[0][0] as DialAuthContext;
      expect(ctx.request).toBe(request);
    });
  });

  describe('Guest token authentication', () => {
    beforeEach(() => {
      // Clerk auth fails → fall through to guest token
      vi.mocked(resolveClerkUserId).mockRejectedValue(new Error('Not authenticated'));
    });

    it('authenticates via X-Dial-Guest-Token header', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'session-1',
        guestToken: 'valid-token',
      });

      const wrapped = withDialAuth(handlerSpy);
      const request = makeRequest('http://localhost:3000/api/dial/chat', {
        'X-Dial-Guest-Token': 'valid-token',
      });
      await wrapped(request);

      expect(handlerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
          guestToken: 'valid-token',
          isGuest: true,
        })
      );
    });

    it('authenticates via query parameter token fallback', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'session-2',
        guestToken: 'query-token',
      });

      const wrapped = withDialAuth(handlerSpy);
      const request = makeRequest('http://localhost:3000/api/dial/download?token=query-token');
      await wrapped(request);

      expect(handlerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
          guestToken: 'query-token',
          isGuest: true,
        })
      );
    });

    it('returns 401 for invalid guest token', async () => {
      mockFindFirst.mockResolvedValue(undefined); // Token not found in DB

      const wrapped = withDialAuth(handlerSpy);
      const request = makeRequest('http://localhost:3000/api/dial/chat', {
        'X-Dial-Guest-Token': 'expired-token',
      });
      const response = await wrapped(request);

      expect(response.status).toBe(401);
      expect(handlerSpy).not.toHaveBeenCalled();
    });

    it('returns 401 for expired guest token', async () => {
      mockFindFirst.mockResolvedValue(undefined); // expired tokens filtered by gt()

      const wrapped = withDialAuth(handlerSpy);
      const request = makeRequest('http://localhost:3000/api/dial/chat', {
        'X-Dial-Guest-Token': 'old-token',
      });
      const response = await wrapped(request);

      expect(response.status).toBe(401);
    });
  });

  describe('No authentication', () => {
    it('returns 401 when neither Clerk nor guest token provided', async () => {
      vi.mocked(resolveClerkUserId).mockRejectedValue(new Error('Not authenticated'));

      const wrapped = withDialAuth(handlerSpy);
      const request = makeRequest();
      const response = await wrapped(request);

      expect(response.status).toBe(401);
      expect(handlerSpy).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('returns 401 when handler throws', async () => {
      vi.mocked(resolveClerkUserId).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const wrapped = withDialAuth(handlerSpy);
      const request = makeRequest();
      const response = await wrapped(request);

      expect(response.status).toBe(401);
    });
  });
});
