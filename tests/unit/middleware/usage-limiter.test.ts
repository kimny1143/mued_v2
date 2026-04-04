/**
 * Usage Limiter Middleware Unit Tests
 *
 * Tests tier-based usage limits for MUEDnote:
 * - Pure functions: getTierInfo, isValidUpgrade
 * - DB-dependent: getUserUsageLimits, checkCanUseHooAI,
 *   incrementHooThreadUsage, incrementHooTurnUsage, resetMonthlyUsage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ========================================
// Mocks
// ========================================

// Mock the TIER_LIMITS from subscriptions repository
vi.mock('@/lib/repositories/subscriptions.repository', () => ({
  TIER_LIMITS: {
    free: { hooThreadsLimit: -1, hooTurnsLimit: -1 },
    basic: { hooThreadsLimit: -1, hooTurnsLimit: -1 },
    premium: { hooThreadsLimit: -1, hooTurnsLimit: -1 },
  },
}));

// Mock Drizzle DB
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockReturning = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();

vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: (table: unknown) => ({
        where: (condition: unknown) => ({
          limit: vi.fn().mockResolvedValue([]),
          orderBy: (order: unknown) => ({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: () => ({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock('@/db/schema', () => ({
  subscriptions: { userId: 'userId', id: 'id', createdAt: 'createdAt' },
  users: { clerkId: 'clerkId' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
  desc: vi.fn((a) => ({ field: a, direction: 'desc' })),
  sql: vi.fn(),
}));

import {
  getTierInfo,
  isValidUpgrade,
  getUserUsageLimits,
  checkCanUseHooAI,
  incrementHooThreadUsage,
  incrementHooTurnUsage,
  resetMonthlyUsage,
} from '@/lib/middleware/usage-limiter';
import { db } from '@/db';

// ========================================
// Pure Function Tests
// ========================================

describe('getTierInfo', () => {
  it('returns correct info for free tier', () => {
    const info = getTierInfo('free');
    expect(info.tier).toBe('free');
    expect(info.displayName).toBe('Free');
    expect(info.price).toBe(0);
    expect(info.features).toBeInstanceOf(Array);
    expect(info.features.length).toBeGreaterThan(0);
  });

  it('returns correct info for basic tier', () => {
    const info = getTierInfo('basic');
    expect(info.tier).toBe('basic');
    expect(info.displayName).toBe('Basic');
    expect(info.price).toBe(1980);
  });

  it('returns correct info for premium tier', () => {
    const info = getTierInfo('premium');
    expect(info.tier).toBe('premium');
    expect(info.displayName).toBe('Premium');
    expect(info.price).toBe(2980);
  });

  it('falls back to free tier for unknown tier', () => {
    const info = getTierInfo('unknown');
    expect(info.tier).toBe('unknown');
    expect(info.displayName).toBe('Unknown');
    expect(info.limits).toEqual({ hooThreadsLimit: -1, hooTurnsLimit: -1 });
  });

  it('includes features list for each tier', () => {
    const freeFeatues = getTierInfo('free').features;
    const basicFeatures = getTierInfo('basic').features;
    const premiumFeatures = getTierInfo('premium').features;

    expect(freeFeatues.length).toBeGreaterThan(0);
    expect(basicFeatures.length).toBeGreaterThan(0);
    expect(premiumFeatures.length).toBeGreaterThan(0);
  });

  it('returns empty features for unknown tier', () => {
    const info = getTierInfo('nonexistent');
    expect(info.features).toEqual([]);
  });
});

describe('isValidUpgrade', () => {
  it('allows free → basic upgrade', () => {
    expect(isValidUpgrade('free', 'basic')).toBe(true);
  });

  it('allows free → premium upgrade', () => {
    expect(isValidUpgrade('free', 'premium')).toBe(true);
  });

  it('allows basic → premium upgrade', () => {
    expect(isValidUpgrade('basic', 'premium')).toBe(true);
  });

  it('rejects same tier', () => {
    expect(isValidUpgrade('free', 'free')).toBe(false);
    expect(isValidUpgrade('basic', 'basic')).toBe(false);
    expect(isValidUpgrade('premium', 'premium')).toBe(false);
  });

  it('rejects downgrade', () => {
    expect(isValidUpgrade('premium', 'basic')).toBe(false);
    expect(isValidUpgrade('premium', 'free')).toBe(false);
    expect(isValidUpgrade('basic', 'free')).toBe(false);
  });

  it('handles unknown tiers (indexOf returns -1)', () => {
    // unknown current tier: indexOf=-1, any known tier index > -1 → true
    expect(isValidUpgrade('unknown', 'basic')).toBe(true);
    // unknown new tier: indexOf=-1, -1 > 0 → false
    expect(isValidUpgrade('free', 'unknown')).toBe(false);
  });
});

// ========================================
// DB-Dependent Function Tests
// ========================================

describe('getUserUsageLimits', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns free tier defaults when user not found', async () => {
    // db.select().from().where().limit() returns []
    vi.spyOn(db, 'select').mockReturnValue({
      from: () => ({
        where: () => ({
          limit: vi.fn().mockResolvedValue([]),
          orderBy: () => ({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as any);

    const limits = await getUserUsageLimits('clerk_nonexistent');

    expect(limits.tier).toBe('free');
    expect(limits.canUseHooAI).toBe(true);
    expect(limits.hooThreadsUsed).toBe(0);
    expect(limits.hooTurnsUsed).toBe(0);
    expect(limits.hooThreadsRemaining).toBe(-1); // unlimited
    expect(limits.hooTurnsRemaining).toBe(-1); // unlimited
    expect(limits.hooThreadsExceeded).toBe(false);
  });

  it('returns correct limits for user with active subscription', async () => {
    const mockUser = { id: 'user-uuid-1', clerkId: 'clerk_123' };
    const mockSubscription = {
      tier: 'basic',
      hooConversationsUsed: 5,
      hooTurnsUsed: 50,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date('2026-05-01'),
    };

    let callCount = 0;
    vi.spyOn(db, 'select').mockReturnValue({
      from: () => ({
        where: () => {
          callCount++;
          if (callCount === 1) {
            // First call: user lookup
            return {
              limit: vi.fn().mockResolvedValue([mockUser]),
              orderBy: () => ({
                limit: vi.fn().mockResolvedValue([mockUser]),
              }),
            };
          }
          // Second call: subscription lookup
          return {
            limit: vi.fn().mockResolvedValue([mockSubscription]),
            orderBy: () => ({
              limit: vi.fn().mockResolvedValue([mockSubscription]),
            }),
          };
        },
      }),
    } as any);

    const limits = await getUserUsageLimits('clerk_123');

    expect(limits.tier).toBe('basic');
    expect(limits.hooThreadsUsed).toBe(5);
    expect(limits.hooTurnsUsed).toBe(50);
    expect(limits.canUseHooAI).toBe(true); // unlimited tier
    expect(limits.cancelAtPeriodEnd).toBe(false);
  });

  it('defaults to free tier when user exists but has no subscription', async () => {
    const mockUser = { id: 'user-uuid-2', clerkId: 'clerk_456' };

    let callCount = 0;
    vi.spyOn(db, 'select').mockReturnValue({
      from: () => ({
        where: () => {
          callCount++;
          if (callCount === 1) {
            return {
              limit: vi.fn().mockResolvedValue([mockUser]),
              orderBy: () => ({
                limit: vi.fn().mockResolvedValue([mockUser]),
              }),
            };
          }
          return {
            limit: vi.fn().mockResolvedValue([]),
            orderBy: () => ({
              limit: vi.fn().mockResolvedValue([]),
            }),
          };
        },
      }),
    } as any);

    const limits = await getUserUsageLimits('clerk_456');

    expect(limits.tier).toBe('free');
    expect(limits.canUseHooAI).toBe(true);
  });
});

describe('checkCanUseHooAI', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('always returns allowed=true after free-ification', async () => {
    vi.spyOn(db, 'select').mockReturnValue({
      from: () => ({
        where: () => ({
          limit: vi.fn().mockResolvedValue([]),
          orderBy: () => ({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as any);

    const result = await checkCanUseHooAI('clerk_any');

    expect(result.allowed).toBe(true);
    expect(result.threadAlert).toBe(false);
    expect(result.limits).toBeDefined();
  });
});

describe('incrementHooThreadUsage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when user not found', async () => {
    vi.spyOn(db, 'select').mockReturnValue({
      from: () => ({
        where: () => ({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any);

    await expect(incrementHooThreadUsage('clerk_nonexistent')).rejects.toThrow('User not found');
  });

  it('updates existing subscription', async () => {
    const mockUser = { id: 'user-uuid-1', clerkId: 'clerk_123' };
    const mockReturning = vi.fn().mockResolvedValue([{ id: 'sub-1' }]);

    vi.spyOn(db, 'select').mockReturnValue({
      from: () => ({
        where: () => ({
          limit: vi.fn().mockResolvedValue([mockUser]),
        }),
      }),
    } as any);

    vi.spyOn(db, 'update').mockReturnValue({
      set: () => ({
        where: () => ({
          returning: mockReturning,
        }),
      }),
    } as any);

    await incrementHooThreadUsage('clerk_123');

    expect(db.update).toHaveBeenCalled();
    expect(mockReturning).toHaveBeenCalled();
  });

  it('creates subscription if none exists', async () => {
    const mockUser = { id: 'user-uuid-1', clerkId: 'clerk_123' };
    const mockValues = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(db, 'select').mockReturnValue({
      from: () => ({
        where: () => ({
          limit: vi.fn().mockResolvedValue([mockUser]),
        }),
      }),
    } as any);

    vi.spyOn(db, 'update').mockReturnValue({
      set: () => ({
        where: () => ({
          returning: vi.fn().mockResolvedValue([]), // No existing sub
        }),
      }),
    } as any);

    vi.spyOn(db, 'insert').mockReturnValue({
      values: mockValues,
    } as any);

    await incrementHooThreadUsage('clerk_123');

    expect(db.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: 'free',
        status: 'active',
        hooConversationsUsed: 1,
        hooTurnsUsed: 0,
      })
    );
  });
});

describe('incrementHooTurnUsage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when user not found', async () => {
    vi.spyOn(db, 'select').mockReturnValue({
      from: () => ({
        where: () => ({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any);

    await expect(incrementHooTurnUsage('clerk_nonexistent')).rejects.toThrow('User not found');
  });

  it('updates existing subscription', async () => {
    const mockUser = { id: 'user-uuid-1', clerkId: 'clerk_123' };
    const mockReturning = vi.fn().mockResolvedValue([{ id: 'sub-1' }]);

    vi.spyOn(db, 'select').mockReturnValue({
      from: () => ({
        where: () => ({
          limit: vi.fn().mockResolvedValue([mockUser]),
        }),
      }),
    } as any);

    vi.spyOn(db, 'update').mockReturnValue({
      set: () => ({
        where: () => ({
          returning: mockReturning,
        }),
      }),
    } as any);

    await incrementHooTurnUsage('clerk_123');

    expect(db.update).toHaveBeenCalled();
  });

  it('creates subscription if none exists', async () => {
    const mockUser = { id: 'user-uuid-1', clerkId: 'clerk_123' };
    const mockValues = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(db, 'select').mockReturnValue({
      from: () => ({
        where: () => ({
          limit: vi.fn().mockResolvedValue([mockUser]),
        }),
      }),
    } as any);

    vi.spyOn(db, 'update').mockReturnValue({
      set: () => ({
        where: () => ({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any);

    vi.spyOn(db, 'insert').mockReturnValue({
      values: mockValues,
    } as any);

    await incrementHooTurnUsage('clerk_123');

    expect(db.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: 'free',
        status: 'active',
        hooConversationsUsed: 0,
        hooTurnsUsed: 1,
      })
    );
  });
});

describe('resetMonthlyUsage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when user not found', async () => {
    vi.spyOn(db, 'select').mockReturnValue({
      from: () => ({
        where: () => ({
          limit: vi.fn().mockResolvedValue([]),
          orderBy: () => ({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as any);

    await expect(resetMonthlyUsage('clerk_nonexistent')).rejects.toThrow('User not found');
  });

  it('resets counters for existing subscription', async () => {
    const mockUser = { id: 'user-uuid-1', clerkId: 'clerk_123' };
    const mockSubscription = { id: 'sub-1', hooConversationsUsed: 10, hooTurnsUsed: 100 };
    const mockSetFn = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    let callCount = 0;
    vi.spyOn(db, 'select').mockReturnValue({
      from: () => ({
        where: () => {
          callCount++;
          if (callCount === 1) {
            return {
              limit: vi.fn().mockResolvedValue([mockUser]),
              orderBy: () => ({
                limit: vi.fn().mockResolvedValue([mockUser]),
              }),
            };
          }
          return {
            limit: vi.fn().mockResolvedValue([mockSubscription]),
            orderBy: () => ({
              limit: vi.fn().mockResolvedValue([mockSubscription]),
            }),
          };
        },
      }),
    } as any);

    vi.spyOn(db, 'update').mockReturnValue({
      set: mockSetFn,
    } as any);

    await resetMonthlyUsage('clerk_123');

    expect(db.update).toHaveBeenCalled();
    expect(mockSetFn).toHaveBeenCalledWith(
      expect.objectContaining({
        hooConversationsUsed: 0,
        hooTurnsUsed: 0,
      })
    );
  });

  it('does nothing when no subscription exists', async () => {
    const mockUser = { id: 'user-uuid-1', clerkId: 'clerk_123' };

    let callCount = 0;
    vi.spyOn(db, 'select').mockReturnValue({
      from: () => ({
        where: () => {
          callCount++;
          if (callCount === 1) {
            return {
              limit: vi.fn().mockResolvedValue([mockUser]),
              orderBy: () => ({
                limit: vi.fn().mockResolvedValue([mockUser]),
              }),
            };
          }
          return {
            limit: vi.fn().mockResolvedValue([]),
            orderBy: () => ({
              limit: vi.fn().mockResolvedValue([]),
            }),
          };
        },
      }),
    } as any);

    vi.spyOn(db, 'update').mockReturnValue({
      set: vi.fn(),
    } as any);

    await resetMonthlyUsage('clerk_123');

    // update should NOT be called since no subscription exists
    expect(db.update).not.toHaveBeenCalled();
  });
});
