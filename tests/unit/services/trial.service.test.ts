/**
 * TrialService Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
    tier: 'tier',
    status: 'status',
    trialStartedAt: 'trial_started_at',
    trialUsed: 'trial_used',
    trialTurnsUsed: 'trial_turns_used',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ a, b })),
  sql: vi.fn((strings, ...values) => ({ strings, values })),
}));

import { TrialService, TRIAL_DAYS, TRIAL_TURNS_LIMIT } from '@/lib/services/trial.service';
import { db } from '@/db/edge';

describe('TrialService', () => {
  let service: TrialService;
  let originalDate: typeof Date;

  const mockUserId = 'user-123';
  const mockNow = new Date('2026-02-14T12:00:00Z');

  beforeEach(() => {
    service = new TrialService();
    vi.clearAllMocks();

    // Mock Date.now() to return consistent time
    originalDate = global.Date;
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ========================================
  // Helper Functions
  // ========================================

  const setupSelectMock = (returnValue: any) => {
    const mockLimit = vi.fn().mockResolvedValue(returnValue);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);
  };

  const setupUpdateMock = (returnValue: any) => {
    const mockReturning = vi.fn().mockResolvedValue(returnValue);
    const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);
  };

  const setupUpdateMockWithoutReturning = () => {
    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);
  };

  const createMockSubscription = (overrides = {}) => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: mockUserId,
    tier: 'free',
    status: 'active',
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    trialStartedAt: null,
    trialUsed: false,
    trialTurnsUsed: 0,
    aiMaterialsUsed: 0,
    reservationsUsed: 0,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  // ========================================
  // getTrialStatus Tests
  // ========================================

  describe('getTrialStatus', () => {
    it('returns NOT_STARTED when no subscription record exists', async () => {
      setupSelectMock([]);

      const result = await service.getTrialStatus(mockUserId);

      expect(result).toEqual({
        isInTrial: false,
        hasTrialStarted: false,
        trialUsed: false,
        trialStartedAt: null,
        trialEndsAt: null,
        daysRemaining: 0,
        turnsUsed: 0,
        turnsRemaining: TRIAL_TURNS_LIMIT,
        reason: 'NOT_STARTED',
      });
    });

    it('returns PAID_TIER for basic tier users', async () => {
      const mockSubscription = createMockSubscription({ tier: 'basic' });
      setupSelectMock([mockSubscription]);

      const result = await service.getTrialStatus(mockUserId);

      expect(result).toEqual({
        isInTrial: false,
        hasTrialStarted: false,
        trialUsed: false,
        trialStartedAt: null,
        trialEndsAt: null,
        daysRemaining: 0,
        turnsUsed: 0,
        turnsRemaining: 0,
        reason: 'PAID_TIER',
      });
    });

    it('returns PAID_TIER for premium tier users', async () => {
      const mockSubscription = createMockSubscription({ tier: 'premium' });
      setupSelectMock([mockSubscription]);

      const result = await service.getTrialStatus(mockUserId);

      expect(result.reason).toBe('PAID_TIER');
      expect(result.isInTrial).toBe(false);
    });

    it('returns NOT_STARTED for free tier with no trial started', async () => {
      const mockSubscription = createMockSubscription({
        tier: 'free',
        trialStartedAt: null,
      });
      setupSelectMock([mockSubscription]);

      const result = await service.getTrialStatus(mockUserId);

      expect(result).toEqual({
        isInTrial: false,
        hasTrialStarted: false,
        trialUsed: false,
        trialStartedAt: null,
        trialEndsAt: null,
        daysRemaining: TRIAL_DAYS,
        turnsUsed: 0,
        turnsRemaining: TRIAL_TURNS_LIMIT,
        reason: 'NOT_STARTED',
      });
    });

    it('returns isInTrial=true for active trial (within 3 days, under 50 turns)', async () => {
      const trialStartedAt = new Date(mockNow);
      trialStartedAt.setDate(trialStartedAt.getDate() - 1); // Started 1 day ago

      const mockSubscription = createMockSubscription({
        tier: 'free',
        trialStartedAt,
        trialUsed: false,
        trialTurnsUsed: 25,
      });
      setupSelectMock([mockSubscription]);

      const result = await service.getTrialStatus(mockUserId);

      expect(result.isInTrial).toBe(true);
      expect(result.hasTrialStarted).toBe(true);
      expect(result.trialUsed).toBe(false);
      expect(result.daysRemaining).toBe(2); // 3 days - 1 day elapsed
      expect(result.turnsUsed).toBe(25);
      expect(result.turnsRemaining).toBe(25);
      expect(result.reason).toBeUndefined();
    });

    it('returns EXPIRED when trial period has passed (> 3 days)', async () => {
      const trialStartedAt = new Date(mockNow);
      trialStartedAt.setDate(trialStartedAt.getDate() - 4); // Started 4 days ago

      const mockSubscription = createMockSubscription({
        tier: 'free',
        trialStartedAt,
        trialUsed: false,
        trialTurnsUsed: 30,
      });
      setupSelectMock([mockSubscription]);
      setupUpdateMockWithoutReturning(); // For markTrialAsUsed

      const result = await service.getTrialStatus(mockUserId);

      expect(result.isInTrial).toBe(false);
      expect(result.hasTrialStarted).toBe(true);
      expect(result.trialUsed).toBe(true);
      expect(result.daysRemaining).toBe(0);
      expect(result.reason).toBe('EXPIRED');

      // Verify markTrialAsUsed was called
      expect(db.update).toHaveBeenCalled();
    });

    it('returns TURNS_EXHAUSTED when turns reach 50', async () => {
      const trialStartedAt = new Date(mockNow);
      trialStartedAt.setDate(trialStartedAt.getDate() - 1); // Started 1 day ago (still within period)

      const mockSubscription = createMockSubscription({
        tier: 'free',
        trialStartedAt,
        trialUsed: false,
        trialTurnsUsed: 50,
      });
      setupSelectMock([mockSubscription]);
      setupUpdateMockWithoutReturning(); // For markTrialAsUsed

      const result = await service.getTrialStatus(mockUserId);

      expect(result.isInTrial).toBe(false);
      expect(result.hasTrialStarted).toBe(true);
      expect(result.trialUsed).toBe(true);
      expect(result.turnsUsed).toBe(50);
      expect(result.turnsRemaining).toBe(0);
      expect(result.reason).toBe('TURNS_EXHAUSTED');

      // Verify markTrialAsUsed was called
      expect(db.update).toHaveBeenCalled();
    });

    it('returns ALREADY_USED when trialUsed flag is true', async () => {
      const trialStartedAt = new Date(mockNow);
      trialStartedAt.setDate(trialStartedAt.getDate() - 2);

      const mockSubscription = createMockSubscription({
        tier: 'free',
        trialStartedAt,
        trialUsed: true,
        trialTurnsUsed: 45,
      });
      setupSelectMock([mockSubscription]);

      const result = await service.getTrialStatus(mockUserId);

      expect(result.isInTrial).toBe(false);
      expect(result.hasTrialStarted).toBe(true);
      expect(result.trialUsed).toBe(true);
      expect(result.daysRemaining).toBe(0);
      expect(result.turnsRemaining).toBe(0);
      expect(result.reason).toBe('ALREADY_USED');
    });

    it('calculates daysRemaining correctly at trial boundaries', async () => {
      const trialStartedAt = new Date(mockNow);
      trialStartedAt.setDate(trialStartedAt.getDate() - 2); // Started 2 days ago
      trialStartedAt.setHours(mockNow.getHours() - 1); // Started 2d 1h ago

      const mockSubscription = createMockSubscription({
        tier: 'free',
        trialStartedAt,
        trialUsed: false,
        trialTurnsUsed: 10,
      });
      setupSelectMock([mockSubscription]);

      const result = await service.getTrialStatus(mockUserId);

      expect(result.isInTrial).toBe(true);
      expect(result.daysRemaining).toBe(1); // Less than 1 day remaining, but ceiling rounds to 1
    });
  });

  // ========================================
  // checkTrialEligibility Tests
  // ========================================

  describe('checkTrialEligibility', () => {
    it('returns NO_SUBSCRIPTION when no subscription exists', async () => {
      setupSelectMock([]);

      const result = await service.checkTrialEligibility(mockUserId);

      expect(result).toEqual({
        canStartTrial: false,
        reason: 'NO_SUBSCRIPTION',
      });
    });

    it('returns PAID_TIER for paid tier users', async () => {
      const mockSubscription = createMockSubscription({ tier: 'basic' });
      setupSelectMock([mockSubscription]);

      const result = await service.checkTrialEligibility(mockUserId);

      expect(result).toEqual({
        canStartTrial: false,
        reason: 'PAID_TIER',
      });
    });

    it('returns ALREADY_USED when trial has been used', async () => {
      const mockSubscription = createMockSubscription({
        tier: 'free',
        trialUsed: true,
      });
      setupSelectMock([mockSubscription]);

      const result = await service.checkTrialEligibility(mockUserId);

      expect(result).toEqual({
        canStartTrial: false,
        reason: 'ALREADY_USED',
      });
    });

    it('returns ALREADY_STARTED when trial has already started', async () => {
      const mockSubscription = createMockSubscription({
        tier: 'free',
        trialStartedAt: new Date(),
        trialUsed: false,
      });
      setupSelectMock([mockSubscription]);

      const result = await service.checkTrialEligibility(mockUserId);

      expect(result).toEqual({
        canStartTrial: false,
        reason: 'ALREADY_STARTED',
      });
    });

    it('returns canStartTrial=true for eligible free tier user', async () => {
      const mockSubscription = createMockSubscription({
        tier: 'free',
        trialStartedAt: null,
        trialUsed: false,
      });
      setupSelectMock([mockSubscription]);

      const result = await service.checkTrialEligibility(mockUserId);

      expect(result).toEqual({
        canStartTrial: true,
      });
    });
  });

  // ========================================
  // getEffectiveTier Tests
  // ========================================

  describe('getEffectiveTier', () => {
    it('returns "free" when no subscription exists', async () => {
      setupSelectMock([]);

      const result = await service.getEffectiveTier(mockUserId);

      expect(result).toBe('free');
    });

    it('returns actual tier for basic tier users', async () => {
      const mockSubscription = createMockSubscription({ tier: 'basic' });
      setupSelectMock([mockSubscription]);

      const result = await service.getEffectiveTier(mockUserId);

      expect(result).toBe('basic');
    });

    it('returns actual tier for premium tier users', async () => {
      const mockSubscription = createMockSubscription({ tier: 'premium' });
      setupSelectMock([mockSubscription]);

      const result = await service.getEffectiveTier(mockUserId);

      expect(result).toBe('premium');
    });

    it('returns "basic" for free tier users with active trial', async () => {
      const trialStartedAt = new Date(mockNow);
      trialStartedAt.setDate(trialStartedAt.getDate() - 1); // Started 1 day ago

      const mockSubscription = createMockSubscription({
        tier: 'free',
        trialStartedAt,
        trialUsed: false,
        trialTurnsUsed: 20,
      });
      setupSelectMock([mockSubscription]);

      const result = await service.getEffectiveTier(mockUserId);

      expect(result).toBe('basic');
    });

    it('returns "free" for free tier users with expired trial', async () => {
      const trialStartedAt = new Date(mockNow);
      trialStartedAt.setDate(trialStartedAt.getDate() - 4); // Started 4 days ago (expired)

      const mockSubscription = createMockSubscription({
        tier: 'free',
        trialStartedAt,
        trialUsed: false,
        trialTurnsUsed: 30,
      });

      // Need to mock twice: once for getEffectiveTier, once for getTrialStatus
      setupSelectMock([mockSubscription]);
      setupUpdateMockWithoutReturning(); // For markTrialAsUsed in getTrialStatus

      const result = await service.getEffectiveTier(mockUserId);

      expect(result).toBe('free');
    });

    it('returns "free" for free tier users with no trial started', async () => {
      const mockSubscription = createMockSubscription({
        tier: 'free',
        trialStartedAt: null,
        trialUsed: false,
      });
      setupSelectMock([mockSubscription]);

      const result = await service.getEffectiveTier(mockUserId);

      expect(result).toBe('free');
    });
  });

  // ========================================
  // startTrial Tests
  // ========================================

  describe('startTrial', () => {
    it('starts trial successfully for eligible user', async () => {
      const mockSubscription = createMockSubscription({
        tier: 'free',
        trialStartedAt: null,
        trialUsed: false,
      });

      // Mock for checkTrialEligibility
      setupSelectMock([mockSubscription]);

      // Mock for update
      const updatedSubscription = { ...mockSubscription, trialStartedAt: mockNow };
      setupUpdateMock([updatedSubscription]);

      const result = await service.startTrial(mockUserId);

      expect(result.success).toBe(true);
      expect(result.trialStartedAt).toEqual(mockNow);
      expect(result.error).toBeUndefined();

      // Verify update was called with correct values
      expect(db.update).toHaveBeenCalled();
    });

    it('returns error when trial already started', async () => {
      const mockSubscription = createMockSubscription({
        tier: 'free',
        trialStartedAt: new Date(mockNow),
        trialUsed: false,
      });
      setupSelectMock([mockSubscription]);

      const result = await service.startTrial(mockUserId);

      expect(result.success).toBe(false);
      expect(result.trialStartedAt).toBe(null);
      expect(result.error).toBe('ALREADY_STARTED');
    });

    it('returns error when trial already used', async () => {
      const mockSubscription = createMockSubscription({
        tier: 'free',
        trialStartedAt: new Date(mockNow),
        trialUsed: true,
      });
      setupSelectMock([mockSubscription]);

      const result = await service.startTrial(mockUserId);

      expect(result.success).toBe(false);
      expect(result.trialStartedAt).toBe(null);
      expect(result.error).toBe('ALREADY_USED');
    });

    it('returns error for paid tier users', async () => {
      const mockSubscription = createMockSubscription({ tier: 'basic' });
      setupSelectMock([mockSubscription]);

      const result = await service.startTrial(mockUserId);

      expect(result.success).toBe(false);
      expect(result.trialStartedAt).toBe(null);
      expect(result.error).toBe('PAID_TIER');
    });

    it('returns error when no subscription exists', async () => {
      setupSelectMock([]);

      const result = await service.startTrial(mockUserId);

      expect(result.success).toBe(false);
      expect(result.trialStartedAt).toBe(null);
      expect(result.error).toBe('NO_SUBSCRIPTION');
    });

    it('returns error when update fails', async () => {
      const mockSubscription = createMockSubscription({
        tier: 'free',
        trialStartedAt: null,
        trialUsed: false,
      });
      setupSelectMock([mockSubscription]);
      setupUpdateMock([]); // Empty array = update failed

      const result = await service.startTrial(mockUserId);

      expect(result.success).toBe(false);
      expect(result.trialStartedAt).toBe(null);
      expect(result.error).toBe('UPDATE_FAILED');
    });
  });

  // ========================================
  // incrementTrialTurns Tests
  // ========================================

  describe('incrementTrialTurns', () => {
    it('increments trial turns successfully', async () => {
      const mockUpdated = { trialTurnsUsed: 26 };
      setupUpdateMock([mockUpdated]);

      const result = await service.incrementTrialTurns(mockUserId);

      expect(result.turnsUsed).toBe(26);
      expect(result.turnsRemaining).toBe(TRIAL_TURNS_LIMIT - 26);
      expect(db.update).toHaveBeenCalled();
    });

    it('handles first turn correctly', async () => {
      const mockUpdated = { trialTurnsUsed: 1 };
      setupUpdateMock([mockUpdated]);

      const result = await service.incrementTrialTurns(mockUserId);

      expect(result.turnsUsed).toBe(1);
      expect(result.turnsRemaining).toBe(TRIAL_TURNS_LIMIT - 1);
    });

    it('marks trial as used when reaching 50 turns', async () => {
      const mockUpdated = { trialTurnsUsed: 50 };

      // First call: incrementTrialTurns (with .returning())
      const mockReturning1 = vi.fn().mockResolvedValue([mockUpdated]);
      const mockWhere1 = vi.fn().mockReturnValue({ returning: mockReturning1 });
      const mockSet1 = vi.fn().mockReturnValue({ where: mockWhere1 });

      // Second call: markTrialAsUsed (without .returning())
      const mockWhere2 = vi.fn().mockResolvedValue(undefined);
      const mockSet2 = vi.fn().mockReturnValue({ where: mockWhere2 });

      vi.mocked(db.update)
        .mockReturnValueOnce({ set: mockSet1 } as never)
        .mockReturnValueOnce({ set: mockSet2 } as never);

      const result = await service.incrementTrialTurns(mockUserId);

      expect(result.turnsUsed).toBe(50);
      expect(result.turnsRemaining).toBe(0);

      // Verify markTrialAsUsed was called (db.update called twice)
      expect(db.update).toHaveBeenCalledTimes(2);
    });

    it('does not mark trial as used when at 49 turns', async () => {
      const mockUpdated = { trialTurnsUsed: 49 };
      setupUpdateMock([mockUpdated]);

      const result = await service.incrementTrialTurns(mockUserId);

      expect(result.turnsUsed).toBe(49);
      expect(result.turnsRemaining).toBe(1);

      // Only one update call (increment), no markTrialAsUsed
      expect(db.update).toHaveBeenCalledTimes(1);
    });

    it('handles null trialTurnsUsed in response', async () => {
      const mockUpdated = { trialTurnsUsed: null };
      setupUpdateMock([mockUpdated]);

      const result = await service.incrementTrialTurns(mockUserId);

      expect(result.turnsUsed).toBe(1); // Defaults to 1
      expect(result.turnsRemaining).toBe(TRIAL_TURNS_LIMIT - 1);
    });
  });

  // ========================================
  // markTrialAsUsed Tests
  // ========================================

  describe('markTrialAsUsed', () => {
    it('marks trial as used successfully', async () => {
      setupUpdateMockWithoutReturning();

      await service.markTrialAsUsed(mockUserId);

      expect(db.update).toHaveBeenCalled();
      // Verify update was called with trialUsed: true
      const mockSet = vi.mocked(db.update).mock.results[0].value.set;
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          trialUsed: true,
        })
      );
    });
  });

  // ========================================
  // canUseHooAI Tests
  // ========================================

  describe('canUseHooAI', () => {
    it('returns not allowed when no subscription exists', async () => {
      setupSelectMock([]);

      const result = await service.canUseHooAI(mockUserId);

      expect(result.allowed).toBe(false);
      expect(result.tier).toBe('free');
      expect(result.effectiveTier).toBe('free');
      expect(result.isInTrial).toBe(false);
      expect(result.reason).toBe('NO_SUBSCRIPTION');
    });

    it('returns allowed for basic tier users', async () => {
      const mockSubscription = createMockSubscription({ tier: 'basic' });
      setupSelectMock([mockSubscription]);

      const result = await service.canUseHooAI(mockUserId);

      expect(result.allowed).toBe(true);
      expect(result.tier).toBe('basic');
      expect(result.effectiveTier).toBe('basic');
      expect(result.isInTrial).toBe(false);
      expect(result.reason).toBeUndefined();
    });

    it('returns allowed for premium tier users', async () => {
      const mockSubscription = createMockSubscription({ tier: 'premium' });
      setupSelectMock([mockSubscription]);

      const result = await service.canUseHooAI(mockUserId);

      expect(result.allowed).toBe(true);
      expect(result.tier).toBe('premium');
      expect(result.effectiveTier).toBe('premium');
      expect(result.isInTrial).toBe(false);
    });

    it('returns allowed for free tier users with active trial', async () => {
      const trialStartedAt = new Date(mockNow);
      trialStartedAt.setDate(trialStartedAt.getDate() - 1); // Started 1 day ago

      const mockSubscription = createMockSubscription({
        tier: 'free',
        trialStartedAt,
        trialUsed: false,
        trialTurnsUsed: 20,
      });
      setupSelectMock([mockSubscription]);

      const result = await service.canUseHooAI(mockUserId);

      expect(result.allowed).toBe(true);
      expect(result.tier).toBe('free');
      expect(result.effectiveTier).toBe('basic');
      expect(result.isInTrial).toBe(true);
      expect(result.trialStatus).toBeDefined();
      expect(result.trialStatus?.isInTrial).toBe(true);
    });

    it('returns TRIAL_NOT_STARTED for free tier users who have not started trial', async () => {
      const mockSubscription = createMockSubscription({
        tier: 'free',
        trialStartedAt: null,
        trialUsed: false,
      });
      setupSelectMock([mockSubscription]);

      const result = await service.canUseHooAI(mockUserId);

      expect(result.allowed).toBe(false);
      expect(result.tier).toBe('free');
      expect(result.effectiveTier).toBe('free');
      expect(result.isInTrial).toBe(false);
      expect(result.reason).toBe('TRIAL_NOT_STARTED');
      expect(result.trialStatus).toBeDefined();
    });

    it('returns not allowed with EXPIRED reason for expired trial', async () => {
      const trialStartedAt = new Date(mockNow);
      trialStartedAt.setDate(trialStartedAt.getDate() - 4); // Started 4 days ago

      const mockSubscription = createMockSubscription({
        tier: 'free',
        trialStartedAt,
        trialUsed: false,
        trialTurnsUsed: 30,
      });
      setupSelectMock([mockSubscription]);
      setupUpdateMockWithoutReturning(); // For markTrialAsUsed

      const result = await service.canUseHooAI(mockUserId);

      expect(result.allowed).toBe(false);
      expect(result.tier).toBe('free');
      expect(result.effectiveTier).toBe('free');
      expect(result.isInTrial).toBe(false);
      expect(result.reason).toBe('EXPIRED');
    });

    it('returns not allowed with TURNS_EXHAUSTED reason when turns depleted', async () => {
      const trialStartedAt = new Date(mockNow);
      trialStartedAt.setDate(trialStartedAt.getDate() - 1); // Still within period

      const mockSubscription = createMockSubscription({
        tier: 'free',
        trialStartedAt,
        trialUsed: false,
        trialTurnsUsed: 50,
      });
      setupSelectMock([mockSubscription]);
      setupUpdateMockWithoutReturning(); // For markTrialAsUsed

      const result = await service.canUseHooAI(mockUserId);

      expect(result.allowed).toBe(false);
      expect(result.tier).toBe('free');
      expect(result.effectiveTier).toBe('free');
      expect(result.isInTrial).toBe(false);
      expect(result.reason).toBe('TURNS_EXHAUSTED');
    });

    it('returns not allowed with ALREADY_USED reason when trial marked as used', async () => {
      const trialStartedAt = new Date(mockNow);
      trialStartedAt.setDate(trialStartedAt.getDate() - 2);

      const mockSubscription = createMockSubscription({
        tier: 'free',
        trialStartedAt,
        trialUsed: true,
        trialTurnsUsed: 45,
      });
      setupSelectMock([mockSubscription]);

      const result = await service.canUseHooAI(mockUserId);

      expect(result.allowed).toBe(false);
      expect(result.tier).toBe('free');
      expect(result.effectiveTier).toBe('free');
      expect(result.isInTrial).toBe(false);
      expect(result.reason).toBe('ALREADY_USED');
    });
  });
});
