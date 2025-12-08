/**
 * MaterialRepository Unit Tests
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
  materials: {
    id: 'id',
    creatorId: 'creator_id',
    title: 'title',
    description: 'description',
    type: 'type',
    isPublic: 'is_public',
    qualityStatus: 'quality_status',
    playabilityScore: 'playability_score',
    learningValueScore: 'learning_value_score',
    viewCount: 'view_count',
    createdAt: 'created_at',
  },
  learningMetrics: {
    id: 'id',
    userId: 'user_id',
    materialId: 'material_id',
  },
  users: {
    id: 'id',
    name: 'name',
    email: 'email',
    profileImageUrl: 'profile_image_url',
  },
}));

vi.mock('drizzle-orm', () => ({
  desc: vi.fn((col) => col),
  eq: vi.fn((a, b) => ({ a, b })),
  and: vi.fn((...args) => args),
  like: vi.fn((a, b) => ({ a, b })),
  sql: vi.fn((strings, ...values) => ({ strings, values })),
  or: vi.fn((...args) => args),
}));

import { MaterialRepository } from '@/lib/repositories/materials.repository';
import { db } from '@/db/edge';

describe('MaterialRepository', () => {
  let repository: MaterialRepository;

  const mockMaterial = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    creatorId: 'creator-123',
    title: 'Test Material',
    description: 'A test material',
    content: 'Content here',
    type: 'text',
    url: null,
    tags: ['music', 'theory'],
    difficulty: 'beginner',
    isPublic: false,
    viewCount: 0,
    metadata: null,
    playabilityScore: '7.5',
    learningValueScore: '8.0',
    qualityStatus: 'pending',
    abcAnalysis: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLearningMetrics = {
    id: 'metrics-123',
    userId: 'user-123',
    materialId: mockMaterial.id,
    sectionsCompleted: 5,
    sectionsTotal: 10,
    achievementRate: '50.00',
    repetitionCount: 3,
    repetitionIndex: '1.5',
    targetTempo: 120,
    achievedTempo: 100,
    tempoAchievement: '83.33',
    weakSpots: null,
    totalPracticeTime: 3600,
    lastPracticedAt: new Date(),
    instrument: 'piano',
    sessionCount: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    repository = new MaterialRepository();
    vi.clearAllMocks();

    // Setup chain mocks for insert
    const mockValues = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([mockMaterial]),
    });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

    // Setup chain mocks for select
    const mockLimit = vi.fn().mockResolvedValue([mockMaterial]);
    const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit, offset: vi.fn().mockResolvedValue([mockMaterial]) });
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit, orderBy: mockOrderBy });
    const mockLeftJoin = vi.fn().mockReturnValue({ where: mockWhere });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, leftJoin: mockLeftJoin });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

    // Setup chain mocks for update
    const mockUpdateReturning = vi.fn().mockResolvedValue([mockMaterial]);
    const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
    const mockSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

    // Setup chain mocks for delete
    const mockDeleteReturning = vi.fn().mockResolvedValue([mockMaterial]);
    const mockDeleteWhere = vi.fn().mockReturnValue({ returning: mockDeleteReturning });
    vi.mocked(db.delete).mockReturnValue({ where: mockDeleteWhere } as never);
  });

  describe('create', () => {
    it('should create a new material with minimal input', async () => {
      const input = {
        creatorId: 'creator-123',
        title: 'New Material',
        type: 'text' as const,
      };

      const result = await repository.create(input);

      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual(mockMaterial);
    });

    it('should create a material with quality scores', async () => {
      const input = {
        creatorId: 'creator-123',
        title: 'Scored Material',
        type: 'music' as const,
        playabilityScore: 8.5,
        learningValueScore: 9.0,
        qualityStatus: 'approved' as const,
      };

      const result = await repository.create(input);

      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual(mockMaterial);
    });

    it('should create a material with all fields', async () => {
      const input = {
        creatorId: 'creator-123',
        title: 'Full Material',
        description: 'Description',
        content: 'Content',
        type: 'interactive' as const,
        url: 'https://example.com',
        tags: ['tag1', 'tag2'],
        difficulty: 'advanced' as const,
        isPublic: true,
        metadata: { key: 'value' },
      };

      const result = await repository.create(input);

      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual(mockMaterial);
    });
  });

  describe('findById', () => {
    it('should return material when found', async () => {
      const result = await repository.findById(mockMaterial.id);

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(mockMaterial);
    });

    it('should return null when not found', async () => {
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findMany', () => {
    it('should return materials with default filters', async () => {
      const mockOrderBy = vi.fn().mockResolvedValue([mockMaterial]);
      const mockFrom = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.findMany();

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual([mockMaterial]);
    });

    it('should filter by creatorId', async () => {
      const mockOrderBy = vi.fn().mockResolvedValue([mockMaterial]);
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.findMany({ creatorId: 'creator-123' });

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual([mockMaterial]);
    });

    it('should filter by type and difficulty', async () => {
      const mockOrderBy = vi.fn().mockResolvedValue([mockMaterial]);
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.findMany({
        type: 'music',
        difficulty: 'intermediate',
      });

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual([mockMaterial]);
    });

    it('should apply pagination', async () => {
      const mockOffset = vi.fn().mockResolvedValue([mockMaterial]);
      const mockLimit = vi.fn().mockReturnValue({ offset: mockOffset });
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.findMany({ limit: 10, offset: 20 });

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual([mockMaterial]);
    });
  });

  describe('findPublic', () => {
    it('should return only public approved materials', async () => {
      const mockOrderBy = vi.fn().mockResolvedValue([mockMaterial]);
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.findPublic();

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual([mockMaterial]);
    });
  });

  describe('update', () => {
    it('should update material fields', async () => {
      const updateInput = {
        title: 'Updated Title',
        description: 'Updated description',
      };

      const result = await repository.update(mockMaterial.id, updateInput);

      expect(db.update).toHaveBeenCalled();
      expect(result).toEqual(mockMaterial);
    });

    it('should update quality scores', async () => {
      const updateInput = {
        playabilityScore: 9.0,
        learningValueScore: 9.5,
        qualityStatus: 'approved' as const,
      };

      const result = await repository.update(mockMaterial.id, updateInput);

      expect(db.update).toHaveBeenCalled();
      expect(result).toEqual(mockMaterial);
    });
  });

  describe('delete', () => {
    it('should delete material by id', async () => {
      const result = await repository.delete(mockMaterial.id);

      expect(db.delete).toHaveBeenCalled();
      expect(result).toEqual(mockMaterial);
    });
  });

  describe('incrementViewCount', () => {
    it('should increment view count', async () => {
      const result = await repository.incrementViewCount(mockMaterial.id);

      expect(db.update).toHaveBeenCalled();
      expect(result).toEqual(mockMaterial);
    });
  });

  describe('approve', () => {
    it('should set quality status to approved', async () => {
      const result = await repository.approve(mockMaterial.id);

      expect(db.update).toHaveBeenCalled();
      expect(result).toEqual(mockMaterial);
    });
  });

  describe('Learning Metrics', () => {
    beforeEach(() => {
      // Override insert mock for learning metrics
      const mockValues = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockLearningMetrics]),
      });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);
    });

    describe('createLearningMetrics', () => {
      it('should create learning metrics', async () => {
        const input = {
          userId: 'user-123',
          materialId: mockMaterial.id,
          targetTempo: 120,
          instrument: 'piano',
        };

        const result = await repository.createLearningMetrics(input);

        expect(db.insert).toHaveBeenCalled();
        expect(result).toEqual(mockLearningMetrics);
      });
    });

    describe('findLearningMetrics', () => {
      it('should return learning metrics when found', async () => {
        const mockLimit = vi.fn().mockResolvedValue([mockLearningMetrics]);
        const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
        const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
        vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

        const result = await repository.findLearningMetrics('user-123', mockMaterial.id);

        expect(db.select).toHaveBeenCalled();
        expect(result).toEqual(mockLearningMetrics);
      });

      it('should return null when not found', async () => {
        const mockLimit = vi.fn().mockResolvedValue([]);
        const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
        const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
        vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

        const result = await repository.findLearningMetrics('user-123', 'non-existent');

        expect(result).toBeNull();
      });
    });

    describe('updateLearningMetrics', () => {
      it('should update learning metrics', async () => {
        const mockUpdateReturning = vi.fn().mockResolvedValue([mockLearningMetrics]);
        const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
        const mockSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
        vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

        const updateInput = {
          sectionsCompleted: 7,
          achievedTempo: 110,
        };

        const result = await repository.updateLearningMetrics(
          'user-123',
          mockMaterial.id,
          updateInput
        );

        expect(db.update).toHaveBeenCalled();
        expect(result).toEqual(mockLearningMetrics);
      });
    });
  });

  describe('Statistics', () => {
    describe('countByCreator', () => {
      it('should return count of materials by creator', async () => {
        const mockWhere = vi.fn().mockResolvedValue([{ count: 5 }]);
        const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
        vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

        const result = await repository.countByCreator('creator-123');

        expect(result).toBe(5);
      });
    });

    describe('countPublic', () => {
      it('should return count of public approved materials', async () => {
        const mockWhere = vi.fn().mockResolvedValue([{ count: 10 }]);
        const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
        vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

        const result = await repository.countPublic();

        expect(result).toBe(10);
      });
    });
  });
});
