/**
 * CognitiveProfileRepository Unit Tests
 *
 * Tests cognitive profile CRUD, upsert with versioning,
 * measurement history, and Hoo config management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ========================================
// Mock Database
// ========================================

vi.mock('@/db/edge', () => ({
  db: {
    select: vi.fn(),
    selectDistinct: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/db/schema', () => ({
  cognitiveProfiles: { userId: 'user_id' },
  measurementHistory: { userId: 'user_id', gameType: 'game_type' },
  hooConfigurations: { userId: 'user_id' },
}));

vi.mock('@/db/schema/cognitive-profiles', () => ({}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ a, b })),
}));

import { CognitiveProfileRepository } from '@/lib/repositories/cognitive-profiles.repository';
import { db } from '@/db/edge';

// ========================================
// Tests
// ========================================

describe('CognitiveProfileRepository', () => {
  let repo: CognitiveProfileRepository;

  const mockProfile = {
    id: 'cp-1',
    userId: 'clerk_123',
    wmScore: 75,
    psScore: 60,
    vcScore: 80,
    prScore: 65,
    attScore: 70,
    significantPatterns: ['high-verbal'],
    version: 1,
    measuredAt: new Date(),
  };

  beforeEach(() => {
    repo = new CognitiveProfileRepository();
    vi.restoreAllMocks();
  });

  describe('findByUserId', () => {
    it('returns profile when found', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: () => ({
          where: () => ({
            limit: vi.fn().mockResolvedValue([mockProfile]),
          }),
        }),
      } as any);

      const result = await repo.findByUserId('clerk_123');
      expect(result).toEqual(mockProfile);
    });

    it('returns null when not found', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: () => ({
          where: () => ({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await repo.findByUserId('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    const newData = {
      wmScore: 80,
      psScore: 65,
      vcScore: 85,
      prScore: 70,
      attScore: 75,
      significantPatterns: ['high-verbal', 'balanced'],
      promptParams: {},
    };

    it('updates existing profile with incremented version', async () => {
      const updated = { ...mockProfile, ...newData, version: 2 };

      // findByUserId returns existing
      vi.mocked(db.select).mockReturnValue({
        from: () => ({
          where: () => ({
            limit: vi.fn().mockResolvedValue([mockProfile]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: () => ({
          where: () => ({
            returning: vi.fn().mockResolvedValue([updated]),
          }),
        }),
      } as any);

      const result = await repo.upsert('clerk_123', newData as any);

      expect(result).toEqual(updated);
      expect(db.update).toHaveBeenCalled();
    });

    it('creates new profile when none exists', async () => {
      const created = { id: 'cp-new', userId: 'clerk_456', ...newData, version: 1 };

      // findByUserId returns null
      vi.mocked(db.select).mockReturnValue({
        from: () => ({
          where: () => ({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: () => ({
          returning: vi.fn().mockResolvedValue([created]),
        }),
      } as any);

      const result = await repo.upsert('clerk_456', newData as any);

      expect(result).toEqual(created);
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes and returns profile', async () => {
      vi.mocked(db.delete).mockReturnValue({
        where: () => ({
          returning: vi.fn().mockResolvedValue([mockProfile]),
        }),
      } as any);

      const result = await repo.delete('clerk_123');
      expect(result).toEqual(mockProfile);
    });

    it('returns null when nothing to delete', async () => {
      vi.mocked(db.delete).mockReturnValue({
        where: () => ({
          returning: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await repo.delete('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('addMeasurement', () => {
    it('inserts and returns measurement', async () => {
      const measurement = {
        userId: 'clerk_123',
        gameType: 'tone-sequence',
        score: 85,
        percentile: 90,
        measuredAt: new Date(),
      };

      vi.mocked(db.insert).mockReturnValue({
        values: () => ({
          returning: vi.fn().mockResolvedValue([{ id: 'mh-1', ...measurement }]),
        }),
      } as any);

      const result = await repo.addMeasurement(measurement as any);
      expect(result).toEqual(expect.objectContaining({ gameType: 'tone-sequence', score: 85 }));
    });
  });

  describe('findMeasurementsByUserId', () => {
    it('returns all measurements for user', async () => {
      const measurements = [
        { id: 'mh-1', gameType: 'tone-sequence', score: 85 },
        { id: 'mh-2', gameType: 'word-bridge', score: 72 },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: () => ({
          where: vi.fn().mockResolvedValue(measurements),
        }),
      } as any);

      const result = await repo.findMeasurementsByUserId('clerk_123');
      expect(result).toHaveLength(2);
    });
  });

  describe('findDistinctGameTypesByUserId', () => {
    it('returns unique game types', async () => {
      vi.mocked(db.selectDistinct).mockReturnValue({
        from: () => ({
          where: vi.fn().mockResolvedValue([
            { gameType: 'tone-sequence' },
            { gameType: 'word-bridge' },
            { gameType: 'focus-flow' },
          ]),
        }),
      } as any);

      const result = await repo.findDistinctGameTypesByUserId('clerk_123');
      expect(result).toEqual(['tone-sequence', 'word-bridge', 'focus-flow']);
    });

    it('returns empty array when no games played', async () => {
      vi.mocked(db.selectDistinct).mockReturnValue({
        from: () => ({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await repo.findDistinctGameTypesByUserId('new_user');
      expect(result).toEqual([]);
    });
  });

  describe('findHooConfig', () => {
    it('returns config when found', async () => {
      const config = { id: 'hc-1', userId: 'clerk_123', specialInstructions: ['Be brief'] };

      vi.mocked(db.select).mockReturnValue({
        from: () => ({
          where: () => ({
            limit: vi.fn().mockResolvedValue([config]),
          }),
        }),
      } as any);

      const result = await repo.findHooConfig('clerk_123');
      expect(result).toEqual(config);
    });

    it('returns null when not found', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: () => ({
          where: () => ({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await repo.findHooConfig('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('upsertHooConfig', () => {
    it('updates existing config', async () => {
      const existing = { id: 'hc-1', userId: 'clerk_123', specialInstructions: ['Old'] };
      const updated = { ...existing, specialInstructions: ['New instruction'] };

      vi.mocked(db.select).mockReturnValue({
        from: () => ({
          where: () => ({
            limit: vi.fn().mockResolvedValue([existing]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: () => ({
          where: () => ({
            returning: vi.fn().mockResolvedValue([updated]),
          }),
        }),
      } as any);

      const result = await repo.upsertHooConfig('clerk_123', {
        specialInstructions: ['New instruction'],
      });

      expect(result).toEqual(updated);
    });

    it('creates new config when none exists', async () => {
      const created = { id: 'hc-new', userId: 'clerk_456', customPrompt: 'Custom' };

      vi.mocked(db.select).mockReturnValue({
        from: () => ({
          where: () => ({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: () => ({
          returning: vi.fn().mockResolvedValue([created]),
        }),
      } as any);

      const result = await repo.upsertHooConfig('clerk_456', { customPrompt: 'Custom' });
      expect(result).toEqual(created);
    });
  });
});
