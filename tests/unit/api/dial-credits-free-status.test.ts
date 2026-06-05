/**
 * GET /api/dial/credits/free-status — free mix_diagnosis eligibility (#413 activation导线 Phase 1).
 *
 * Read-only eligibility口. Mirrors subscription/status (200 on unauth, no 401).
 * Covers all branches: unauthenticated, no-email, non-waitlist (skips free-used check),
 * eligible, already-used, and fail-closed on a storage error.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db client + schema + drizzle eq (route only uses these to build the query;
// the mocked db chain ignores the args). Keeps the test off a real Neon connection.
vi.mock('@/db', () => ({ db: { select: vi.fn() } }));
vi.mock('@/db/schema', () => ({ users: { clerkId: 'clerk_id', email: 'email' } }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn((a, b) => ({ a, b })) }));
vi.mock('@/lib/storage/waitlist-blob', () => ({ checkWaitlistEmailExists: vi.fn() }));
vi.mock('@/lib/storage/mix-diagnosis-free', () => ({ checkMixDiagnosisFreeUsed: vi.fn() }));
vi.mock('@/lib/utils/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

import { GET } from '@/app/api/dial/credits/free-status/route';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { checkWaitlistEmailExists } from '@/lib/storage/waitlist-blob';
import { checkMixDiagnosisFreeUsed } from '@/lib/storage/mix-diagnosis-free';

/** Stub db.select(...).from(...).where(...).limit(1) → resolves to `rows`. */
function stubEmailLookup(rows: Array<{ email: string }>) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  vi.mocked(db.select).mockReturnValue({ from } as never);
}

describe('GET /api/dial/credits/free-status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the safe default (200, not 401) when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      signedIn: false, isWaitlistMember: false, freeDiagnosisUsed: false, eligible: false,
    });
  });

  it('returns signedIn but ineligible when the user has no email', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    stubEmailLookup([]);
    const res = await GET();
    await expect(res.json()).resolves.toEqual({
      signedIn: true, isWaitlistMember: false, freeDiagnosisUsed: false, eligible: false,
    });
  });

  it('is ineligible and skips the free-used check when not a waitlist member', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    stubEmailLookup([{ email: 'a@b.com' }]);
    vi.mocked(checkWaitlistEmailExists).mockResolvedValue(false);
    const res = await GET();
    await expect(res.json()).resolves.toEqual({
      signedIn: true, isWaitlistMember: false, freeDiagnosisUsed: false, eligible: false,
    });
    expect(checkMixDiagnosisFreeUsed).not.toHaveBeenCalled();
  });

  it('is eligible for a waitlist member who has not used the free diagnosis', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    stubEmailLookup([{ email: 'a@b.com' }]);
    vi.mocked(checkWaitlistEmailExists).mockResolvedValue(true);
    vi.mocked(checkMixDiagnosisFreeUsed).mockResolvedValue(false);
    const res = await GET();
    await expect(res.json()).resolves.toEqual({
      signedIn: true, isWaitlistMember: true, freeDiagnosisUsed: false, eligible: true,
    });
  });

  it('is ineligible for a waitlist member who already used the free diagnosis', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    stubEmailLookup([{ email: 'a@b.com' }]);
    vi.mocked(checkWaitlistEmailExists).mockResolvedValue(true);
    vi.mocked(checkMixDiagnosisFreeUsed).mockResolvedValue(true);
    const res = await GET();
    await expect(res.json()).resolves.toEqual({
      signedIn: true, isWaitlistMember: true, freeDiagnosisUsed: true, eligible: false,
    });
  });

  it('fails closed (eligible:false) when the eligibility store throws', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    stubEmailLookup([{ email: 'a@b.com' }]);
    vi.mocked(checkWaitlistEmailExists).mockRejectedValue(new Error('blob down'));
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      signedIn: true, isWaitlistMember: false, freeDiagnosisUsed: false, eligible: false,
    });
  });

  it('fails closed (200, never 500) when the user lookup (db) throws', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    const limit = vi.fn().mockRejectedValue(new Error('neon down'));
    vi.mocked(db.select).mockReturnValue({ from: () => ({ where: () => ({ limit }) }) } as never);
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      signedIn: true, isWaitlistMember: false, freeDiagnosisUsed: false, eligible: false,
    });
  });
});
