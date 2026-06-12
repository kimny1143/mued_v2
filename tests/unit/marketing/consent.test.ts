/**
 * recordConsent unit tests — the write path for the self-owned list.
 *
 * Locks the review-observation family from the product課 handoff:
 *  - the Audience sync is actually INVOKED after the tx (callback-invocation-gap guard)
 *  - a sync failure NEVER propagates to the caller (best-effort, non-blocking)
 *  - policy_version defaults to MARKETING_POLICY_VERSION (threshold/constant realism)
 *  - the de-normalized users.marketing_consent mirrors status === 'granted'
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockTx = {
  insert: vi.fn(() => ({ values: mockInsertValues })),
  update: vi.fn(() => ({ set: mockUpdateSet })),
};
const mockSelectLimit = vi.fn().mockResolvedValue([{ email: 'u@example.com', name: 'Yuu' }]);
const mockTransaction = vi.fn(async (cb: (tx: typeof mockTx) => Promise<void>) => cb(mockTx));

vi.mock('@/db', () => ({
  db: {
    transaction: (cb: (tx: typeof mockTx) => Promise<void>) => mockTransaction(cb),
    select: () => ({ from: () => ({ where: () => ({ limit: mockSelectLimit }) }) }),
  },
}));

vi.mock('@/db/schema', () => ({
  marketingConsents: {},
  users: { id: 'id', email: 'email', name: 'name' },
}));

vi.mock('drizzle-orm', () => ({ eq: vi.fn((a, b) => ({ a, b })) }));

vi.mock('@/lib/utils/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));

const mockSyncConsentToAudience = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/marketing/audience-sync', () => ({
  syncConsentToAudience: (...args: unknown[]) => mockSyncConsentToAudience(...args),
}));

import { recordConsent, MARKETING_POLICY_VERSION } from '@/lib/marketing/consent';
import { logger } from '@/lib/utils/logger';

// The Audience sync fires from a `void (async () => {})()` after recordConsent resolves —
// flush the microtask/macrotask queue so we can assert on it.
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('recordConsent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSyncConsentToAudience.mockResolvedValue(undefined);
    mockSelectLimit.mockResolvedValue([{ email: 'u@example.com', name: 'Yuu' }]);
  });

  it('granted: writes ledger row + sets users.marketing_consent=true + fires audience sync', async () => {
    await recordConsent({ userId: 'uuid-1', status: 'granted', source: 'free15_claim', locale: 'ja' });

    // Ledger insert with the supplied fields + default policy version.
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'uuid-1',
        status: 'granted',
        source: 'free15_claim',
        locale: 'ja',
        policyVersion: MARKETING_POLICY_VERSION,
      }),
    );
    // De-normalized current value mirrors granted=true.
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ marketingConsent: true, marketingConsentAt: expect.any(Date) }),
    );

    // Audience sync is INVOKED (not dead code) with the user's email + status.
    await flush();
    expect(mockSyncConsentToAudience).toHaveBeenCalledWith({
      email: 'u@example.com',
      name: 'Yuu',
      status: 'granted',
    });
  });

  it('withdrawn: sets users.marketing_consent=false and syncs withdrawn', async () => {
    await recordConsent({ userId: 'uuid-1', status: 'withdrawn', source: 'settings', locale: 'en' });

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ marketingConsent: false }),
    );
    await flush();
    expect(mockSyncConsentToAudience).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'withdrawn' }),
    );
  });

  it('respects an explicit policyVersion override', async () => {
    await recordConsent({
      userId: 'uuid-1',
      status: 'granted',
      source: 'onboarding',
      locale: 'ja',
      policyVersion: '2099-01-01',
    });
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ policyVersion: '2099-01-01' }),
    );
  });

  it('best-effort: an audience-sync failure never rejects recordConsent', async () => {
    mockSyncConsentToAudience.mockRejectedValueOnce(new Error('resend down'));
    await expect(
      recordConsent({ userId: 'uuid-1', status: 'granted', source: 'free15_claim', locale: 'ja' }),
    ).resolves.toBeUndefined();
    await flush();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('skips the audience sync when the user has no email', async () => {
    mockSelectLimit.mockResolvedValueOnce([{ email: null, name: null }]);
    await recordConsent({ userId: 'uuid-1', status: 'granted', source: 'free15_claim', locale: 'ja' });
    await flush();
    expect(mockSyncConsentToAudience).not.toHaveBeenCalled();
  });
});
