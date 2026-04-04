/**
 * HooMemoriesRepository Unit Tests
 *
 * Tests custom instructions and auto-memory CRUD with enabled/disabled logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ========================================
// Mock Database
// ========================================

vi.mock('@/db/edge', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/db/schema', () => ({
  hooMemories: {
    userId: 'user_id',
    customInstructions: 'custom_instructions',
    customInstructionsEnabled: 'custom_instructions_enabled',
    autoMemories: 'auto_memories',
    autoMemoryEnabled: 'auto_memory_enabled',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ a, b })),
}));

import { HooMemoriesRepository } from '@/lib/repositories/hoo-memories.repository';
import { db } from '@/db/edge';

// ========================================
// Helper
// ========================================

function setupSelectMock(result: unknown[]) {
  vi.mocked(db.select).mockReturnValue({
    from: () => ({
      where: () => ({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  } as any);
}

function setupInsertMock(result: unknown) {
  vi.mocked(db.insert).mockReturnValue({
    values: () => ({
      returning: vi.fn().mockResolvedValue([result]),
    }),
  } as any);
}

function setupUpdateMock(result: unknown) {
  vi.mocked(db.update).mockReturnValue({
    set: () => ({
      where: () => ({
        returning: vi.fn().mockResolvedValue([result]),
      }),
    }),
  } as any);
}

// ========================================
// Tests
// ========================================

describe('HooMemoriesRepository', () => {
  let repo: HooMemoriesRepository;

  const mockSettings = {
    id: 'mem-1',
    userId: 'user-123',
    customInstructions: 'Be concise',
    customInstructionsEnabled: true,
    autoMemories: null,
    autoMemoryEnabled: true,
    updatedAt: new Date(),
  };

  beforeEach(() => {
    repo = new HooMemoriesRepository();
    vi.restoreAllMocks();
  });

  describe('getMemorySettings', () => {
    it('returns settings when found', async () => {
      setupSelectMock([mockSettings]);
      const result = await repo.getMemorySettings('user-123');
      expect(result).toEqual(mockSettings);
    });

    it('returns null when not found', async () => {
      setupSelectMock([]);
      const result = await repo.getMemorySettings('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getCustomInstructions', () => {
    it('returns instructions when enabled', async () => {
      setupSelectMock([mockSettings]);
      const result = await repo.getCustomInstructions('user-123');
      expect(result).toBe('Be concise');
    });

    it('returns null when disabled', async () => {
      setupSelectMock([{ ...mockSettings, customInstructionsEnabled: false }]);
      const result = await repo.getCustomInstructions('user-123');
      expect(result).toBeNull();
    });

    it('returns null when no settings exist', async () => {
      setupSelectMock([]);
      const result = await repo.getCustomInstructions('nonexistent');
      expect(result).toBeNull();
    });

    it('returns null when instructions are null but enabled', async () => {
      setupSelectMock([{ ...mockSettings, customInstructions: null }]);
      const result = await repo.getCustomInstructions('user-123');
      expect(result).toBeNull();
    });
  });

  describe('updateCustomInstructions', () => {
    it('updates existing settings', async () => {
      const updated = { ...mockSettings, customInstructions: 'New instructions' };
      // First call: getMemorySettings (select)
      setupSelectMock([mockSettings]);
      setupUpdateMock(updated);

      const result = await repo.updateCustomInstructions({
        userId: 'user-123',
        customInstructions: 'New instructions',
      });

      expect(result).toEqual(updated);
      expect(db.update).toHaveBeenCalled();
    });

    it('creates new settings when none exist', async () => {
      const created = { ...mockSettings, customInstructions: 'First instructions' };
      setupSelectMock([]); // No existing settings
      setupInsertMock(created);

      const result = await repo.updateCustomInstructions({
        userId: 'user-123',
        customInstructions: 'First instructions',
      });

      expect(result).toEqual(created);
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('toggleCustomInstructions', () => {
    it('toggles existing settings', async () => {
      const toggled = { ...mockSettings, customInstructionsEnabled: false };
      setupSelectMock([mockSettings]);
      setupUpdateMock(toggled);

      const result = await repo.toggleCustomInstructions({
        userId: 'user-123',
        enabled: false,
      });

      expect(result).toEqual(toggled);
    });

    it('creates new settings when none exist', async () => {
      const created = { ...mockSettings, customInstructionsEnabled: false };
      setupSelectMock([]);
      setupInsertMock(created);

      const result = await repo.toggleCustomInstructions({
        userId: 'user-123',
        enabled: false,
      });

      expect(result).toEqual(created);
    });
  });

  describe('getAutoMemories', () => {
    it('returns memories when enabled', async () => {
      const memories = [
        { content: 'Uses Logic Pro', category: 'equipment' },
        { content: 'Prefers ambient genre', category: 'genre' },
      ];
      setupSelectMock([{ ...mockSettings, autoMemories: memories, autoMemoryEnabled: true }]);

      const result = await repo.getAutoMemories('user-123');
      expect(result).toEqual(memories);
    });

    it('returns empty array when disabled', async () => {
      setupSelectMock([{ ...mockSettings, autoMemoryEnabled: false }]);
      const result = await repo.getAutoMemories('user-123');
      expect(result).toEqual([]);
    });

    it('returns empty array when no settings exist', async () => {
      setupSelectMock([]);
      const result = await repo.getAutoMemories('nonexistent');
      expect(result).toEqual([]);
    });

    it('returns empty array when memories are null but enabled', async () => {
      setupSelectMock([{ ...mockSettings, autoMemories: null, autoMemoryEnabled: true }]);
      const result = await repo.getAutoMemories('user-123');
      expect(result).toEqual([]);
    });
  });

  describe('updateAutoMemories', () => {
    it('updates existing settings', async () => {
      const memories = [{ content: 'New memory', category: 'skill' }];
      const updated = { ...mockSettings, autoMemories: memories };
      setupSelectMock([mockSettings]);
      setupUpdateMock(updated);

      const result = await repo.updateAutoMemories('user-123', memories);
      expect(result).toEqual(updated);
    });

    it('creates new settings when none exist', async () => {
      const memories = [{ content: 'First memory', category: 'equipment' }];
      const created = { ...mockSettings, autoMemories: memories };
      setupSelectMock([]);
      setupInsertMock(created);

      const result = await repo.updateAutoMemories('user-123', memories);
      expect(result).toEqual(created);
    });
  });

  describe('toggleAutoMemory', () => {
    it('toggles existing settings', async () => {
      const toggled = { ...mockSettings, autoMemoryEnabled: false };
      setupSelectMock([mockSettings]);
      setupUpdateMock(toggled);

      const result = await repo.toggleAutoMemory('user-123', false);
      expect(result).toEqual(toggled);
    });

    it('creates new settings when none exist', async () => {
      const created = { ...mockSettings, autoMemoryEnabled: true };
      setupSelectMock([]);
      setupInsertMock(created);

      const result = await repo.toggleAutoMemory('new-user', true);
      expect(result).toEqual(created);
    });
  });

  describe('delete', () => {
    it('deletes and returns settings', async () => {
      vi.mocked(db.delete).mockReturnValue({
        where: () => ({
          returning: vi.fn().mockResolvedValue([mockSettings]),
        }),
      } as any);

      const result = await repo.delete('user-123');
      expect(result).toEqual(mockSettings);
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
});
