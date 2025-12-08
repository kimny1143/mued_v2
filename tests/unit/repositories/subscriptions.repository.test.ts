/**
 * SubscriptionRepository Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database - must be defined before import
vi.mock('@/db/edge', () => {
  const mockInsert = vi.fn();
  const mockSelect = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();

  return {
    db: {
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
      delete: mockDelete,
    },
  };
});

vi.mock('@/db/schema', () => ({
  subscriptions: {
    id: 'id',
    userId: 'user_id',
    stripeSubscriptionId: 'stripe_subscription_id',
    tier: 'plan',
    status: 'status',
    aiMaterialsUsed: 'ai_materials_used',
    reservationsUsed: 'reservations_used',
    createdAt: 'created_at',
  },
  users: {},
}));

vi.mock('drizzle-orm', () => ({
  desc: vi.fn((col) => col),
  eq: vi.fn((a, b) => ({ a, b })),
  and: vi.fn((...args) => args),
  sql: vi.fn((strings) => strings),
  gte: vi.fn((a, b) => ({ a, b })),
  lte: vi.fn((a, b) => ({ a, b })),
}));

import {
  SubscriptionRepository,
  TIER_LIMITS,
  type SubscriptionTier,
} from '@/lib/repositories/subscriptions.repository';
import { db } from '@/db/edge';

describe('SubscriptionRepository', () => {
  let repository: SubscriptionRepository;

  const mockSubscription = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-123',
    stripeSubscriptionId: 'sub_123',
    stripeCustomerId: 'cus_123',
    tier: 'basic',
    status: 'active',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(),
    cancelAtPeriodEnd: false,
    aiMaterialsUsed: 10,
    reservationsUsed: 3,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    repository = new SubscriptionRepository();
    vi.clearAllMocks();

    // Setup chain mocks for insert
    const mockValues = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([mockSubscription]),
    });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

    // Setup chain mocks for select
    const mockLimit = vi.fn().mockResolvedValue([mockSubscription]);
    const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit, orderBy: mockOrderBy, returning: vi.fn().mockResolvedValue([mockSubscription]) });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

    // Setup chain mocks for update
    const mockUpdateReturning = vi.fn().mockResolvedValue([mockSubscription]);
    const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
    const mockSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

    // Setup chain mocks for delete
    const mockDeleteReturning = vi.fn().mockResolvedValue([mockSubscription]);
    const mockDeleteWhere = vi.fn().mockReturnValue({ returning: mockDeleteReturning });
    vi.mocked(db.delete).mockReturnValue({ where: mockDeleteWhere } as never);
  });

  describe('TIER_LIMITS', () => {
    it('should have correct limits for freemium', () => {
      expect(TIER_LIMITS.freemium).toEqual({
        aiMaterialsLimit: 5,
        reservationsLimit: 1,
      });
    });

    it('should have correct limits for starter', () => {
      expect(TIER_LIMITS.starter).toEqual({
        aiMaterialsLimit: 20,
        reservationsLimit: 5,
      });
    });

    it('should have correct limits for basic', () => {
      expect(TIER_LIMITS.basic).toEqual({
        aiMaterialsLimit: 50,
        reservationsLimit: 15,
      });
    });

    it('should have unlimited for premium', () => {
      expect(TIER_LIMITS.premium).toEqual({
        aiMaterialsLimit: -1,
        reservationsLimit: -1,
      });
    });
  });

  describe('create', () => {
    it('should create a new subscription with defaults', async () => {
      const input = {
        userId: 'user-123',
      };

      const result = await repository.create(input);

      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual(mockSubscription);
    });

    it('should create with Stripe IDs', async () => {
      const input = {
        userId: 'user-456',
        stripeSubscriptionId: 'sub_456',
        stripeCustomerId: 'cus_456',
        tier: 'premium' as SubscriptionTier,
      };

      const result = await repository.create(input);

      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual(mockSubscription);
    });
  });

  describe('findByUserId', () => {
    it('should return subscription for user', async () => {
      const result = await repository.findByUserId('user-123');

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(mockSubscription);
    });
  });

  describe('findActiveByUserId', () => {
    it('should return active subscription', async () => {
      const result = await repository.findActiveByUserId('user-123');

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(mockSubscription);
    });

    it('should return null when no active subscription', async () => {
      // Override mock
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.findActiveByUserId('user-no-sub');

      expect(result).toBeNull();
    });
  });

  describe('canUseAiMaterials', () => {
    it('should return true when under limit', async () => {
      // Mock subscription with usage under limit
      const underLimitSub = { ...mockSubscription, tier: 'basic', aiMaterialsUsed: 10 };
      const mockLimit = vi.fn().mockResolvedValue([underLimitSub]);
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.canUseAiMaterials('user-123');

      expect(result).toBe(true);
    });

    it('should return false when at limit', async () => {
      // Mock subscription with usage at limit
      const atLimitSub = { ...mockSubscription, tier: 'freemium', aiMaterialsUsed: 5 };
      const mockLimit = vi.fn().mockResolvedValue([atLimitSub]);
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.canUseAiMaterials('user-123');

      expect(result).toBe(false);
    });

    it('should return true for premium (unlimited)', async () => {
      const premiumSub = { ...mockSubscription, tier: 'premium', aiMaterialsUsed: 1000 };
      const mockLimit = vi.fn().mockResolvedValue([premiumSub]);
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.canUseAiMaterials('user-123');

      expect(result).toBe(true);
    });

    it('should return false when no subscription', async () => {
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.canUseAiMaterials('user-no-sub');

      expect(result).toBe(false);
    });
  });

  describe('getUsageLimits', () => {
    it('should return usage limits for user', async () => {
      const basicSub = { ...mockSubscription, tier: 'basic', aiMaterialsUsed: 20, reservationsUsed: 5 };
      const mockLimit = vi.fn().mockResolvedValue([basicSub]);
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.getUsageLimits('user-123');

      expect(result).toEqual({
        tier: 'basic',
        aiMaterials: { used: 20, limit: 50 },
        reservations: { used: 5, limit: 15 },
      });
    });

    it('should return freemium limits when no subscription', async () => {
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.getUsageLimits('user-no-sub');

      expect(result).toEqual({
        tier: 'freemium',
        aiMaterials: { used: 0, limit: 5 },
        reservations: { used: 0, limit: 1 },
      });
    });
  });

  describe('cancel', () => {
    it('should set cancelAtPeriodEnd when soft cancel', async () => {
      await repository.cancel(mockSubscription.id, true);

      expect(db.update).toHaveBeenCalled();
    });

    it('should set status to cancelled when hard cancel', async () => {
      await repository.cancel(mockSubscription.id, false);

      expect(db.update).toHaveBeenCalled();
    });
  });
});
