/**
 * Rate Limit Middleware Unit Tests
 *
 * Tests Upstash Redis-based rate limiting:
 * - Redis initialization and fallback behavior
 * - Rate limit checking per type (ai, api, strict, dial, dial-process)
 * - Identifier resolution (user ID vs IP)
 * - Middleware response (429 with headers vs pass-through)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextResponse } from 'next/server';

// ========================================
// Mocks
// ========================================

const mockLimit = vi.fn();

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class MockRatelimit {
    static slidingWindow = vi.fn().mockReturnValue({ type: 'sliding', window: '1 m' });
    limit = mockLimit;
    constructor() {}
  },
}));

vi.mock('@upstash/redis', () => ({
  Redis: class MockRedis {
    constructor() {}
  },
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

// ========================================
// Tests
// ========================================

describe('rate-limit module', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    // Reset env
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('when Redis is not configured', () => {
    it('checkRateLimit returns null', async () => {
      const { checkRateLimit } = await import('@/lib/middleware/rate-limit');
      const result = await checkRateLimit('api', 'user:123');
      expect(result).toBeNull();
    });

    it('rateLimit middleware returns null (allows request)', async () => {
      const { rateLimit } = await import('@/lib/middleware/rate-limit');
      const request = new Request('http://localhost:3000/api/test');
      const result = await rateLimit(request, 'api');
      expect(result).toBeNull();
    });
  });

  describe('when Redis is configured', () => {
    beforeEach(() => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    });

    it('checkRateLimit returns success result when under limit', async () => {
      mockLimit.mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      const { checkRateLimit } = await import('@/lib/middleware/rate-limit');
      const result = await checkRateLimit('api', 'user:123');

      expect(result).not.toBeNull();
      expect(result!.success).toBe(true);
      expect(result!.limit).toBe(60);
      expect(result!.remaining).toBe(59);
    });

    it('checkRateLimit returns failure result when over limit', async () => {
      mockLimit.mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 30000,
      });

      const { checkRateLimit } = await import('@/lib/middleware/rate-limit');
      const result = await checkRateLimit('ai', 'user:456');

      expect(result).not.toBeNull();
      expect(result!.success).toBe(false);
      expect(result!.remaining).toBe(0);
    });

    it('rateLimit returns 429 response when rate exceeded', async () => {
      const resetTime = Date.now() + 30000;
      mockLimit.mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: resetTime,
      });

      // Mock auth to return a userId
      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);

      const { rateLimit } = await import('@/lib/middleware/rate-limit');
      const request = new Request('http://localhost:3000/api/hoo/chat');
      const result = await rateLimit(request, 'ai');

      expect(result).toBeInstanceOf(NextResponse);
      expect(result!.status).toBe(429);

      const body = await result!.json();
      expect(body.error).toBe('Too Many Requests');
      expect(body.retryAfter).toBeGreaterThan(0);

      // Check rate limit headers
      expect(result!.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(result!.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(result!.headers.get('Retry-After')).toBeTruthy();
    });

    it('rateLimit returns null when under limit', async () => {
      mockLimit.mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 55,
        reset: Date.now() + 60000,
      });

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);

      const { rateLimit } = await import('@/lib/middleware/rate-limit');
      const request = new Request('http://localhost:3000/api/test');
      const result = await rateLimit(request, 'api');

      expect(result).toBeNull();
    });
  });

  describe('getRateLimitIdentifier', () => {
    beforeEach(() => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    });

    it('returns user ID when authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_789' } as any);

      const { getRateLimitIdentifier } = await import('@/lib/middleware/rate-limit');
      const request = new Request('http://localhost:3000/api/test');
      const id = await getRateLimitIdentifier(request);

      expect(id).toBe('user:clerk_789');
    });

    it('falls back to IP when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const { getRateLimitIdentifier } = await import('@/lib/middleware/rate-limit');
      const request = new Request('http://localhost:3000/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.100, 10.0.0.1' },
      });
      const id = await getRateLimitIdentifier(request);

      expect(id).toBe('ip:192.168.1.100');
    });

    it('uses "unknown" IP when no forwarded header', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const { getRateLimitIdentifier } = await import('@/lib/middleware/rate-limit');
      const request = new Request('http://localhost:3000/api/test');
      const id = await getRateLimitIdentifier(request);

      expect(id).toBe('ip:unknown');
    });

    it('falls back to IP when auth throws', async () => {
      vi.mocked(auth).mockRejectedValue(new Error('Auth failed'));

      const { getRateLimitIdentifier } = await import('@/lib/middleware/rate-limit');
      const request = new Request('http://localhost:3000/api/test', {
        headers: { 'x-forwarded-for': '10.0.0.5' },
      });
      const id = await getRateLimitIdentifier(request);

      expect(id).toBe('ip:10.0.0.5');
    });
  });

  describe('fail-open behavior', () => {
    beforeEach(() => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    });

    it('allows request when rate limit check throws (Redis down)', async () => {
      mockLimit.mockRejectedValue(new Error('Redis connection refused'));
      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { rateLimit } = await import('@/lib/middleware/rate-limit');
      const request = new Request('http://localhost:3000/api/test');
      const result = await rateLimit(request, 'api');

      expect(result).toBeNull(); // fail-open: allow the request
      consoleSpy.mockRestore();
    });
  });

  describe('rate limit types', () => {
    beforeEach(() => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    });

    it.each([
      ['ai', 10],
      ['api', 60],
      ['strict', 5],
      ['dial', 20],
      ['dial-process', 5],
    ] as const)('supports %s rate limit type', async (type) => {
      mockLimit.mockResolvedValue({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
      });

      const { checkRateLimit } = await import('@/lib/middleware/rate-limit');
      const result = await checkRateLimit(type as any, 'user:test');

      expect(result).not.toBeNull();
      expect(result!.success).toBe(true);
    });
  });
});
