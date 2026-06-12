/**
 * /api/marketing/consent route unit tests (self-owned list PR2).
 *
 * Verifies: auth guard, GET de-normalized status mapping (true→granted / false→withdrawn / null→null),
 * POST zod validation, and that POST resolves the INTERNAL users.id and calls recordConsent with
 * source:'settings' (FK-integrity + correct provenance).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = vi.fn();
vi.mock('@clerk/nextjs/server', () => ({ auth: () => mockAuth() }));

const mockGetUserIdFromClerkId = vi.fn();
vi.mock('@/lib/utils/auth-helpers', () => ({
  getUserIdFromClerkId: (...a: unknown[]) => mockGetUserIdFromClerkId(...a),
}));

const mockRecordConsent = vi.fn();
vi.mock('@/lib/marketing/consent', () => ({
  recordConsent: (...a: unknown[]) => mockRecordConsent(...a),
}));

const mockSelectLimit = vi.fn();
vi.mock('@/db', () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ limit: mockSelectLimit }) }) }) },
}));
vi.mock('@/db/schema', () => ({
  users: { id: 'id', clerkId: 'clerk_id', marketingConsent: 'marketing_consent' },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn((a, b) => ({ a, b })) }));
vi.mock('@/lib/api-response', () => ({
  apiSuccess: (data: unknown) => ({ kind: 'success', data }),
  apiError: (message: string, opts: Record<string, unknown>) => ({ kind: 'error', message, ...opts }),
  apiValidationError: (message: string, errors: unknown) => ({ kind: 'validation', message, errors }),
  apiServerError: (message: string) => ({ kind: 'server', message }),
}));

import { GET, POST } from '@/app/api/marketing/consent/route';

// Minimal NextRequest stand-in — the route only uses request.json().
const req = (body: unknown) => ({ json: async () => body }) as never;

describe('GET /api/marketing/consent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('401 when not signed in', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    expect(await GET()).toMatchObject({ kind: 'error', code: 'NOT_SIGNED_IN', status: 401 });
  });

  it('true → granted', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_1' });
    mockSelectLimit.mockResolvedValue([{ marketingConsent: true }]);
    expect(await GET()).toMatchObject({ kind: 'success', data: { status: 'granted' } });
  });

  it('false → withdrawn', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_1' });
    mockSelectLimit.mockResolvedValue([{ marketingConsent: false }]);
    expect(await GET()).toMatchObject({ data: { status: 'withdrawn' } });
  });

  it('null → null (never shown)', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_1' });
    mockSelectLimit.mockResolvedValue([{ marketingConsent: null }]);
    expect(await GET()).toMatchObject({ data: { status: null } });
  });
});

describe('POST /api/marketing/consent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('401 when not signed in', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    expect(await POST(req({ status: 'granted' }))).toMatchObject({ code: 'NOT_SIGNED_IN', status: 401 });
    expect(mockRecordConsent).not.toHaveBeenCalled();
  });

  it('validation error on an invalid status (zod)', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_1' });
    const res = await POST(req({ status: 'maybe' }));
    expect(res).toMatchObject({ kind: 'validation' });
    expect(mockRecordConsent).not.toHaveBeenCalled();
  });

  it('records consent with the INTERNAL users.id and source=settings', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_1' });
    mockGetUserIdFromClerkId.mockResolvedValue('uuid-1');
    mockRecordConsent.mockResolvedValue(undefined);
    const res = await POST(req({ status: 'granted', locale: 'ja' }));
    expect(mockGetUserIdFromClerkId).toHaveBeenCalledWith('clerk_1');
    expect(mockRecordConsent).toHaveBeenCalledWith({
      userId: 'uuid-1',
      status: 'granted',
      source: 'settings',
      locale: 'ja',
    });
    expect(res).toMatchObject({ kind: 'success', data: { status: 'granted' } });
  });

  it('defaults locale to ja when omitted; withdrawal is allowed', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_1' });
    mockGetUserIdFromClerkId.mockResolvedValue('uuid-1');
    mockRecordConsent.mockResolvedValue(undefined);
    await POST(req({ status: 'withdrawn' }));
    expect(mockRecordConsent).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'withdrawn', source: 'settings', locale: 'ja' }),
    );
  });
});
