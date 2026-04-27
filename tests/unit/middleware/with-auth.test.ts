/**
 * Auth Middleware Unit Tests
 *
 * Tests authentication middleware variants:
 * - withAuth: Basic Clerk authentication
 * - withAuthResolved: Clerk + internal DB user ID resolution
 * - withAdminAuth: Admin-only authentication
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withAuthResolved, withAdminAuth } from '@/lib/middleware/with-auth';

// ========================================
// Mock Clerk and Auth Helpers
// ========================================

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/utils/auth-helpers', () => ({
  getUserIdFromClerkId: vi.fn(),
}));

vi.mock('@/lib/api-response', async () => {
  const actual = await vi.importActual('@/lib/api-response');
  return actual;
});

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('@/lib/middleware/admin', () => ({
  isAdmin: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { getUserIdFromClerkId } from '@/lib/utils/auth-helpers';
import { isAdmin } from '@/lib/middleware/admin';

// ========================================
// Test Helpers
// ========================================

function makeRequest(url: string = 'http://localhost:3000/api/test'): NextRequest {
  return new NextRequest(url);
}

async function parseJsonResponse(response: NextResponse) {
  const text = await response.text();
  return JSON.parse(text);
}

// ========================================
// withAuth Tests
// ========================================

describe('withAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call handler with userId when authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_user123' } as any);

    const handler = vi.fn(async ({ userId }) => {
      return NextResponse.json({ userId });
    });

    const wrappedHandler = withAuth(handler);
    const request = makeRequest();
    const response = await wrappedHandler(request);

    expect(handler).toHaveBeenCalledWith({
      userId: 'clerk_user123',
      request,
    });

    const data = await parseJsonResponse(response);
    expect(data.userId).toBe('clerk_user123');
  });

  it('should return 401 when no userId', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const handler = vi.fn();
    const wrappedHandler = withAuth(handler);
    const request = makeRequest();
    const response = await wrappedHandler(request);

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(401);

    const data = await parseJsonResponse(response);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 401 when auth throws error', async () => {
    vi.mocked(auth).mockRejectedValue(new Error('Auth service down'));

    const handler = vi.fn();
    const wrappedHandler = withAuth(handler);
    const request = makeRequest();
    const response = await wrappedHandler(request);

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(401);

    const data = await parseJsonResponse(response);
    expect(data.success).toBe(false);
  });

  it('should pass request object to handler', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_user123' } as any);

    const handler = vi.fn(async ({ request }) => {
      return NextResponse.json({ url: request.url });
    });

    const wrappedHandler = withAuth(handler);
    const request = makeRequest('http://localhost:3000/api/materials?sort=date');
    await wrappedHandler(request);

    expect(handler).toHaveBeenCalledWith({
      userId: 'clerk_user123',
      request,
    });
  });
});

// ========================================
// withAuthResolved Tests
// ========================================

describe('withAuthResolved', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resolve both clerkUserId and internalUserId when authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_user123' } as any);
    vi.mocked(getUserIdFromClerkId).mockResolvedValue('db-uuid-456');

    const handler = vi.fn(async ({ clerkUserId, internalUserId }) => {
      return NextResponse.json({ clerkUserId, internalUserId });
    });

    const wrappedHandler = withAuthResolved(handler);
    const request = makeRequest();
    const response = await wrappedHandler(request);

    expect(getUserIdFromClerkId).toHaveBeenCalledWith('clerk_user123');
    expect(handler).toHaveBeenCalledWith({
      clerkUserId: 'clerk_user123',
      internalUserId: 'db-uuid-456',
      request,
    });

    const data = await parseJsonResponse(response);
    expect(data.clerkUserId).toBe('clerk_user123');
    expect(data.internalUserId).toBe('db-uuid-456');
  });

  it('should return 401 when no userId', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const handler = vi.fn();
    const wrappedHandler = withAuthResolved(handler);
    const request = makeRequest();
    const response = await wrappedHandler(request);

    expect(handler).not.toHaveBeenCalled();
    expect(getUserIdFromClerkId).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
  });

  it('should return 500 when user not found in database', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_user123' } as any);
    vi.mocked(getUserIdFromClerkId).mockRejectedValue(new Error('User not found'));

    const handler = vi.fn();
    const wrappedHandler = withAuthResolved(handler);
    const request = makeRequest();
    const response = await wrappedHandler(request);

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(500);

    const data = await parseJsonResponse(response);
    expect(data.success).toBe(false);
    expect(data.error).toBe('User not found in database');
  });

  it('should return 401 when auth throws error', async () => {
    vi.mocked(auth).mockRejectedValue(new Error('Auth service down'));

    const handler = vi.fn();
    const wrappedHandler = withAuthResolved(handler);
    const request = makeRequest();
    const response = await wrappedHandler(request);

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
  });

  it('should pass request object to handler', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_user123' } as any);
    vi.mocked(getUserIdFromClerkId).mockResolvedValue('db-uuid-456');

    const handler = vi.fn(async ({ request, internalUserId }) => {
      return NextResponse.json({ url: request.url, internalUserId });
    });

    const wrappedHandler = withAuthResolved(handler);
    const request = makeRequest('http://localhost:3000/api/lobe/profile');
    await wrappedHandler(request);

    expect(handler).toHaveBeenCalledWith({
      clerkUserId: 'clerk_user123',
      internalUserId: 'db-uuid-456',
      request,
    });
  });
});

// ========================================
// withAdminAuth Tests
// ========================================

describe('withAdminAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call handler when user is admin', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_admin123' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);

    const handler = vi.fn(async ({ userId }) => {
      return NextResponse.json({ userId, message: 'Admin access granted' });
    });

    const wrappedHandler = withAdminAuth(handler);
    const request = makeRequest();
    const response = await wrappedHandler(request);

    expect(handler).toHaveBeenCalledWith({
      userId: 'clerk_admin123',
      request,
    });

    const data = await parseJsonResponse(response);
    expect(data.message).toBe('Admin access granted');
  });

  it('should return 403 when user is not admin', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_user123' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);

    const handler = vi.fn();
    const wrappedHandler = withAdminAuth(handler);
    const request = makeRequest();
    const response = await wrappedHandler(request);

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(403);

    const data = await parseJsonResponse(response);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Admin access required');
  });

  it('should return 403 when sessionClaims has no metadata', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'clerk_user123',
      sessionClaims: {},
    } as any);

    const handler = vi.fn();
    const wrappedHandler = withAdminAuth(handler);
    const request = makeRequest();
    const response = await wrappedHandler(request);

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(403);
  });

  it('should return 401 when no userId', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const handler = vi.fn();
    const wrappedHandler = withAdminAuth(handler);
    const request = makeRequest();
    const response = await wrappedHandler(request);

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
  });

  it('should return 401 when auth throws error', async () => {
    vi.mocked(auth).mockRejectedValue(new Error('Auth service down'));

    const handler = vi.fn();
    const wrappedHandler = withAdminAuth(handler);
    const request = makeRequest();
    const response = await wrappedHandler(request);

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
  });

  it('should check exact role value "admin"', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'clerk_user123',
      sessionClaims: {
        metadata: {
          role: 'superadmin', // Not exactly 'admin'
        },
      },
    } as any);

    const handler = vi.fn();
    const wrappedHandler = withAdminAuth(handler);
    const request = makeRequest();
    const response = await wrappedHandler(request);

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(403);
  });
});
