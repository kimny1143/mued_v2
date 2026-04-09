/**
 * DialRepository Unit Tests
 *
 * Tests all CRUD operations for:
 * - Sessions: create, findById, findByGuestToken, findByUserId, update
 * - Purchases: create, findById, findBySessionId, update
 * - Subscriptions: findActive, findByStripeId, decrementCredits
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ========================================
// Mocks
// ========================================

const mockFindFirst = vi.fn();
const mockFindMany = vi.fn();

vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    query: {
      dialSessions: {
        findFirst: (...args: any[]) => mockFindFirst(...args),
        findMany: (...args: any[]) => mockFindMany(...args),
      },
      dialPurchases: {
        findFirst: (...args: any[]) => mockFindFirst(...args),
        findMany: (...args: any[]) => mockFindMany(...args),
      },
      dialSubscriptions: {
        findFirst: (...args: any[]) => mockFindFirst(...args),
      },
    },
  },
}));

vi.mock('@/db/schema', () => ({
  dialSessions: { id: 'id', userId: 'user_id', guestToken: 'guest_token', guestTokenExpiresAt: 'guest_token_expires_at', createdAt: 'created_at' },
  dialPurchases: { id: 'id', sessionId: 'session_id', createdAt: 'created_at' },
  dialSubscriptions: { id: 'id', userId: 'user_id', stripeSubscriptionId: 'stripe_subscription_id', status: 'status' },
  dialTracks: {},
  dialTasks: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ a, b })),
  and: vi.fn((...args) => args),
  desc: vi.fn((col) => col),
  gt: vi.fn((a, b) => ({ a, gt: b })),
}));

import { DialRepository } from '@/lib/repositories/dial.repository';
import { db } from '@/db';

// ========================================
// Fixtures
// ========================================

const mockSession = {
  id: 'sess-001',
  userId: 'user-001',
  guestToken: 'guest-abc',
  guestTokenExpiresAt: new Date('2026-05-01'),
  type: 'omakase',
  status: 'active',
  createdAt: new Date('2026-04-10'),
  updatedAt: new Date('2026-04-10'),
};

const mockPurchase = {
  id: 'pur-001',
  sessionId: 'sess-001',
  purchaseType: 'omakase',
  amount: 800,
  status: 'completed',
  createdAt: new Date('2026-04-10'),
};

const mockSubscription = {
  id: 'sub-001',
  userId: 'user-001',
  stripeSubscriptionId: 'sub_stripe_001',
  status: 'active',
  tier: 'standard',
  mixCreditsRemaining: 5,
  updatedAt: new Date('2026-04-10'),
};

// ========================================
// Setup helpers
// ========================================

function setupInsertChain(result: any) {
  const mockReturning = vi.fn().mockResolvedValue([result]);
  const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
  vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);
  return { mockValues, mockReturning };
}

function setupUpdateChain(result: any) {
  const mockReturning = vi.fn().mockResolvedValue([result]);
  const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
  vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);
  return { mockSet, mockWhere, mockReturning };
}

// ========================================
// Tests
// ========================================

describe('DialRepository', () => {
  let repository: DialRepository;

  beforeEach(() => {
    repository = new DialRepository();
    vi.clearAllMocks();
  });

  // ─── Sessions ─────────────────────────────

  describe('createSession', () => {
    it('inserts and returns a session', async () => {
      setupInsertChain(mockSession);

      const result = await repository.createSession({
        userId: 'user-001',
        type: 'omakase',
      } as any);

      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });
  });

  describe('findSessionById', () => {
    it('returns session when found', async () => {
      mockFindFirst.mockResolvedValue(mockSession);

      const result = await repository.findSessionById('sess-001');

      expect(result).toEqual(mockSession);
    });

    it('returns null when not found', async () => {
      mockFindFirst.mockResolvedValue(undefined);

      const result = await repository.findSessionById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findSessionByGuestToken', () => {
    it('returns session for valid guest token', async () => {
      mockFindFirst.mockResolvedValue(mockSession);

      const result = await repository.findSessionByGuestToken('guest-abc');

      expect(result).toEqual(mockSession);
      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.anything() })
      );
    });

    it('returns null for expired or invalid token', async () => {
      mockFindFirst.mockResolvedValue(undefined);

      const result = await repository.findSessionByGuestToken('expired-token');

      expect(result).toBeNull();
    });
  });

  describe('findSessionsByUserId', () => {
    it('returns sessions for a user', async () => {
      mockFindMany.mockResolvedValue([mockSession]);

      const result = await repository.findSessionsByUserId('user-001');

      expect(result).toEqual([mockSession]);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.anything(),
          orderBy: expect.anything(),
        })
      );
    });

    it('returns empty array when no sessions', async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await repository.findSessionsByUserId('user-no-sessions');

      expect(result).toEqual([]);
    });
  });

  describe('updateSession', () => {
    it('updates and returns the session', async () => {
      const updated = { ...mockSession, status: 'completed' };
      setupUpdateChain(updated);

      const result = await repository.updateSession('sess-001', { status: 'completed' } as any);

      expect(db.update).toHaveBeenCalled();
      expect(result).toEqual(updated);
    });

    it('sets updatedAt timestamp', async () => {
      const { mockSet } = setupUpdateChain(mockSession);

      await repository.updateSession('sess-001', { status: 'active' } as any);

      const setArgs = mockSet.mock.calls[0][0];
      expect(setArgs.updatedAt).toBeInstanceOf(Date);
    });

    it('returns null when session not found', async () => {
      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const result = await repository.updateSession('nonexistent', {} as any);

      expect(result).toBeNull();
    });
  });

  // ─── Purchases ────────────────────────────

  describe('createPurchase', () => {
    it('inserts and returns a purchase', async () => {
      setupInsertChain(mockPurchase);

      const result = await repository.createPurchase({
        sessionId: 'sess-001',
        purchaseType: 'omakase',
      } as any);

      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual(mockPurchase);
    });
  });

  describe('findPurchaseById', () => {
    it('returns purchase when found', async () => {
      mockFindFirst.mockResolvedValue(mockPurchase);

      const result = await repository.findPurchaseById('pur-001');

      expect(result).toEqual(mockPurchase);
    });

    it('returns null when not found', async () => {
      mockFindFirst.mockResolvedValue(undefined);

      const result = await repository.findPurchaseById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findPurchasesBySessionId', () => {
    it('returns purchases for a session', async () => {
      mockFindMany.mockResolvedValue([mockPurchase]);

      const result = await repository.findPurchasesBySessionId('sess-001');

      expect(result).toEqual([mockPurchase]);
    });
  });

  describe('updatePurchase', () => {
    it('updates and returns the purchase', async () => {
      const updated = { ...mockPurchase, status: 'refunded' };
      setupUpdateChain(updated);

      const result = await repository.updatePurchase('pur-001', { status: 'refunded' } as any);

      expect(result).toEqual(updated);
    });

    it('returns null when not found', async () => {
      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const result = await repository.updatePurchase('nonexistent', {} as any);

      expect(result).toBeNull();
    });
  });

  // ─── Subscriptions ────────────────────────

  describe('findActiveSubscriptionByUserId', () => {
    it('returns active subscription', async () => {
      mockFindFirst.mockResolvedValue(mockSubscription);

      const result = await repository.findActiveSubscriptionByUserId('user-001');

      expect(result).toEqual(mockSubscription);
    });

    it('returns null when no active subscription', async () => {
      mockFindFirst.mockResolvedValue(undefined);

      const result = await repository.findActiveSubscriptionByUserId('user-no-sub');

      expect(result).toBeNull();
    });
  });

  describe('findSubscriptionByStripeId', () => {
    it('returns subscription by stripe ID', async () => {
      mockFindFirst.mockResolvedValue(mockSubscription);

      const result = await repository.findSubscriptionByStripeId('sub_stripe_001');

      expect(result).toEqual(mockSubscription);
    });

    it('returns null when not found', async () => {
      mockFindFirst.mockResolvedValue(undefined);

      const result = await repository.findSubscriptionByStripeId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('decrementCredits', () => {
    it('decrements credits by 1 and returns updated subscription', async () => {
      // First call: findSubscriptionById (via findFirst)
      mockFindFirst.mockResolvedValueOnce(mockSubscription);

      const updated = { ...mockSubscription, mixCreditsRemaining: 4 };
      setupUpdateChain(updated);

      const result = await repository.decrementCredits('sub-001');

      expect(result).toEqual(updated);
    });

    it('returns null when subscription not found', async () => {
      mockFindFirst.mockResolvedValue(undefined);

      const result = await repository.decrementCredits('nonexistent');

      expect(result).toBeNull();
      expect(db.update).not.toHaveBeenCalled();
    });

    it('returns null when no credits remaining', async () => {
      mockFindFirst.mockResolvedValue({ ...mockSubscription, mixCreditsRemaining: 0 });

      const result = await repository.decrementCredits('sub-001');

      expect(result).toBeNull();
      expect(db.update).not.toHaveBeenCalled();
    });

    it('sets updatedAt on credit decrement', async () => {
      mockFindFirst.mockResolvedValueOnce(mockSubscription);
      const { mockSet } = setupUpdateChain({ ...mockSubscription, mixCreditsRemaining: 4 });

      await repository.decrementCredits('sub-001');

      const setArgs = mockSet.mock.calls[0][0];
      expect(setArgs.mixCreditsRemaining).toBe(4);
      expect(setArgs.updatedAt).toBeInstanceOf(Date);
    });
  });
});
