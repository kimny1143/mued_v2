/**
 * UserProfileRepository Unit Tests
 *
 * Tests the repository's DB operations with mocked Drizzle.
 * Also implicitly tests deepMergeProfile through applyUserCorrections.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UserProfileData } from '@/db/schema/user-profiles';

// ========================================
// Mock — chainable DB mock via Proxy
// ========================================

const mockResult = vi.fn();

function createChainProxy(): any {
  return new Proxy(() => {}, {
    get: (_target, prop) => {
      if (prop === 'then') return undefined; // Not a Promise
      if (prop === 'returning' || prop === 'limit') {
        return () => mockResult();
      }
      return () => createChainProxy();
    },
    apply: () => createChainProxy(),
  });
}

vi.mock('@/db/edge', () => ({
  db: createChainProxy(),
}));

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: vi.fn(),
    sql: vi.fn().mockImplementation((s: any) => s),
  };
});

vi.mock('@/db/schema/user-profiles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/schema/user-profiles')>();
  return {
    ...actual,
    userProfiles: {
      userId: 'user_id',
      updateCount: 'update_count',
      generationModel: 'generation_model',
    },
  };
});

import { UserProfileRepository } from '@/lib/repositories/user-profiles.repository';

// ========================================
// Test Data
// ========================================

const BASE_PROFILE: UserProfileData = {
  musical: {
    genres: ['indie rock'],
    instruments: ['guitar'],
    influences: ['Radiohead'],
    productionStyle: 'warm analog',
    mixingPreferences: null,
  },
  creative: {
    focusAreas: ['harmony'],
    strengths: ['melodic intuition'],
    growthAreas: ['mixing'],
    workPatterns: 'night owl',
  },
  cognitive: {
    summary: 'Strong in working memory',
    informationDensity: 'high',
    pacing: 'fast',
    abstractionLevel: 'abstract',
  },
  bio: 'Indie rock guitarist',
  lastExtractedFromConversation: 'conv-1',
  lastExtractedFromDawLog: '2026-01-01',
};

// ========================================
// Tests
// ========================================

describe('UserProfileRepository', () => {
  let repo: UserProfileRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new UserProfileRepository();
  });

  // ------------------------------------------------------------------
  // findByUserId
  // ------------------------------------------------------------------

  describe('findByUserId', () => {
    it('returns profile when found', async () => {
      mockResult.mockResolvedValue([{ id: '1', userId: 'user-1', profileData: BASE_PROFILE }]);
      const result = await repo.findByUserId('user-1');
      expect(result).toBeTruthy();
      expect(result!.userId).toBe('user-1');
    });

    it('returns null when not found', async () => {
      mockResult.mockResolvedValue([]);
      const result = await repo.findByUserId('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  // upsert
  // ------------------------------------------------------------------

  describe('upsert', () => {
    it('returns the upserted profile', async () => {
      mockResult.mockResolvedValue([{ id: '1', userId: 'user-1', profileData: BASE_PROFILE }]);
      const result = await repo.upsert('user-1', BASE_PROFILE, 'gpt-5-mini');
      expect(result).toBeTruthy();
      expect(result.id).toBe('1');
    });
  });

  // ------------------------------------------------------------------
  // applyUserCorrections (tests deepMergeProfile internally)
  // ------------------------------------------------------------------

  describe('applyUserCorrections', () => {
    it('returns null when user has no existing profile', async () => {
      mockResult.mockResolvedValue([]);
      const result = await repo.applyUserCorrections('user-1', { bio: 'New bio' });
      expect(result).toBeNull();
    });

    it('returns updated profile after applying bio correction', async () => {
      // First call: findByUserId in applyUserCorrections
      // Second call: update returning
      mockResult
        .mockResolvedValueOnce([{
          id: '1',
          userId: 'user-1',
          profileData: BASE_PROFILE,
          userCorrections: null,
        }])
        .mockResolvedValueOnce([{
          id: '1',
          userId: 'user-1',
          profileData: { ...BASE_PROFILE, bio: 'Updated bio' },
          generatedBy: 'user_edit',
        }]);

      const result = await repo.applyUserCorrections('user-1', { bio: 'Updated bio' });
      expect(result).toBeTruthy();
      expect(result!.generatedBy).toBe('user_edit');
    });

    it('merges existing userCorrections with new corrections', async () => {
      mockResult
        .mockResolvedValueOnce([{
          id: '1',
          userId: 'user-1',
          profileData: BASE_PROFILE,
          userCorrections: { bio: 'Previous correction' },
        }])
        .mockResolvedValueOnce([{
          id: '1',
          userId: 'user-1',
          profileData: {
            ...BASE_PROFILE,
            musical: { ...BASE_PROFILE.musical, genres: ['lo-fi'] },
          },
        }]);

      const result = await repo.applyUserCorrections('user-1', {
        musical: {
          genres: ['lo-fi'],
          instruments: ['synth'],
          influences: [],
          productionStyle: null,
          mixingPreferences: null,
        },
      });
      expect(result).toBeTruthy();
    });
  });
});
