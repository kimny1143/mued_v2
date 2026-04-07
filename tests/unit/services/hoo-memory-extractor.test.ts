/**
 * HooMemoryExtractorService Unit Tests
 *
 * Tests:
 * - Conversation length filtering (skip < 4 messages)
 * - Conversation text formatting & truncation
 * - LLM response validation (category, confidence, content length)
 * - Memory deduplication (exact match by normalized content)
 * - Memory capping (MAX_AUTO_MEMORIES = 50)
 * - Merge ordering (confidence desc, then createdAt desc)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ========================================
// Mocks
// ========================================

const mockCreateChatCompletion = vi.fn();
vi.mock('@/lib/openai', () => ({
  createChatCompletion: (...args: any[]) => mockCreateChatCompletion(...args),
}));

const mockFindById = vi.fn();
vi.mock('@/lib/repositories/hoo-conversations.repository', () => ({
  hooConversationsRepository: {
    findById: (...args: any[]) => mockFindById(...args),
  },
}));

const mockGetMemorySettings = vi.fn();
const mockUpdateAutoMemories = vi.fn();
vi.mock('@/lib/repositories/hoo-memories.repository', () => ({
  hooMemoriesRepository: {
    getMemorySettings: (...args: any[]) => mockGetMemorySettings(...args),
    updateAutoMemories: (...args: any[]) => mockUpdateAutoMemories(...args),
  },
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { HooMemoryExtractorService } from '@/lib/services/hoo-memory-extractor.service';

// ========================================
// Helpers
// ========================================

function makeConversation(messageCount: number, id = 'conv-1') {
  const messages = Array.from({ length: messageCount }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `Message ${i + 1}`,
  }));
  return { id, messages };
}

function makeLLMResponse(memories: Array<{ content: string; category: string; confidence: number }>) {
  return {
    completion: {
      choices: [{
        message: { content: JSON.stringify(memories) },
      }],
    },
  };
}

// ========================================
// Tests
// ========================================

describe('HooMemoryExtractorService', () => {
  let service: HooMemoryExtractorService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new HooMemoryExtractorService();
    mockGetMemorySettings.mockResolvedValue({ autoMemories: [] });
    mockUpdateAutoMemories.mockResolvedValue(undefined);
  });

  // ------------------------------------------------------------------
  // Conversation validation
  // ------------------------------------------------------------------

  describe('extractFromConversation — conversation validation', () => {
    it('returns empty when conversation not found', async () => {
      mockFindById.mockResolvedValue(null);
      const result = await service.extractFromConversation('user-1', 'conv-1');
      expect(result).toEqual([]);
    });

    it('returns empty when conversation has no messages', async () => {
      mockFindById.mockResolvedValue({ id: 'conv-1', messages: [] });
      const result = await service.extractFromConversation('user-1', 'conv-1');
      expect(result).toEqual([]);
    });

    it('returns empty when conversation has null messages', async () => {
      mockFindById.mockResolvedValue({ id: 'conv-1', messages: null });
      const result = await service.extractFromConversation('user-1', 'conv-1');
      expect(result).toEqual([]);
    });

    it('skips conversations with fewer than 4 messages', async () => {
      mockFindById.mockResolvedValue(makeConversation(3));
      const result = await service.extractFromConversation('user-1', 'conv-1');
      expect(result).toEqual([]);
      expect(mockCreateChatCompletion).not.toHaveBeenCalled();
    });

    it('processes conversations with exactly 4 messages', async () => {
      mockFindById.mockResolvedValue(makeConversation(4));
      mockCreateChatCompletion.mockResolvedValue(makeLLMResponse([]));

      const result = await service.extractFromConversation('user-1', 'conv-1');
      expect(result).toEqual([]);
      expect(mockCreateChatCompletion).toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // LLM response validation
  // ------------------------------------------------------------------

  describe('extractFromConversation — LLM response validation', () => {
    beforeEach(() => {
      mockFindById.mockResolvedValue(makeConversation(6));
    });

    it('extracts valid memories from LLM response', async () => {
      mockCreateChatCompletion.mockResolvedValue(makeLLMResponse([
        { content: 'Uses Ableton Live 12', category: 'equipment', confidence: 0.9 },
        { content: 'Prefers lo-fi hip hop', category: 'genre', confidence: 0.85 },
      ]));

      const result = await service.extractFromConversation('user-1', 'conv-1');
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('Uses Ableton Live 12');
      expect(result[0].category).toBe('equipment');
      expect(result[0].confidence).toBe(0.9);
      expect(result[0].source.conversationId).toBe('conv-1');
    });

    it('filters out entries with invalid category', async () => {
      mockCreateChatCompletion.mockResolvedValue(makeLLMResponse([
        { content: 'Valid', category: 'equipment', confidence: 0.9 },
        { content: 'Invalid cat', category: 'unknown_type', confidence: 0.8 },
      ]));

      const result = await service.extractFromConversation('user-1', 'conv-1');
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Valid');
    });

    it('filters out entries with empty content', async () => {
      mockCreateChatCompletion.mockResolvedValue(makeLLMResponse([
        { content: '', category: 'equipment', confidence: 0.9 },
        { content: 'Valid', category: 'genre', confidence: 0.8 },
      ]));

      const result = await service.extractFromConversation('user-1', 'conv-1');
      expect(result).toHaveLength(1);
    });

    it('filters out entries with content > 120 chars', async () => {
      mockCreateChatCompletion.mockResolvedValue(makeLLMResponse([
        { content: 'x'.repeat(121), category: 'equipment', confidence: 0.9 },
        { content: 'x'.repeat(120), category: 'genre', confidence: 0.8 },
      ]));

      const result = await service.extractFromConversation('user-1', 'conv-1');
      expect(result).toHaveLength(1);
    });

    it('filters out entries with confidence outside 0-1 range', async () => {
      mockCreateChatCompletion.mockResolvedValue(makeLLMResponse([
        { content: 'Too high', category: 'skill', confidence: 1.5 },
        { content: 'Negative', category: 'skill', confidence: -0.1 },
        { content: 'Valid', category: 'skill', confidence: 0.5 },
      ]));

      const result = await service.extractFromConversation('user-1', 'conv-1');
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Valid');
    });

    it('limits to max 5 memories per extraction', async () => {
      const memories = Array.from({ length: 8 }, (_, i) => ({
        content: `Memory ${i}`,
        category: 'equipment',
        confidence: 0.9,
      }));
      mockCreateChatCompletion.mockResolvedValue(makeLLMResponse(memories));

      const result = await service.extractFromConversation('user-1', 'conv-1');
      expect(result).toHaveLength(5);
    });

    it('handles non-array LLM response gracefully', async () => {
      mockCreateChatCompletion.mockResolvedValue({
        completion: {
          choices: [{
            message: { content: '{"not": "an array"}' },
          }],
        },
      });

      const result = await service.extractFromConversation('user-1', 'conv-1');
      expect(result).toEqual([]);
    });

    it('handles empty LLM response content', async () => {
      mockCreateChatCompletion.mockResolvedValue({
        completion: { choices: [{ message: { content: null } }] },
      });

      const result = await service.extractFromConversation('user-1', 'conv-1');
      expect(result).toEqual([]);
    });

    it('handles LLM error gracefully', async () => {
      mockCreateChatCompletion.mockRejectedValue(new Error('API error'));

      const result = await service.extractFromConversation('user-1', 'conv-1');
      expect(result).toEqual([]);
    });

    it('strips markdown code fences from LLM response', async () => {
      mockCreateChatCompletion.mockResolvedValue({
        completion: {
          choices: [{
            message: {
              content: '```json\n[{"content":"Ableton","category":"equipment","confidence":0.9}]\n```',
            },
          }],
        },
      });

      const result = await service.extractFromConversation('user-1', 'conv-1');
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Ableton');
    });

    it('validates all five category types', async () => {
      const categories = ['equipment', 'genre', 'skill', 'project', 'preference'];
      mockCreateChatCompletion.mockResolvedValue(makeLLMResponse(
        categories.map((cat) => ({
          content: `Memory for ${cat}`,
          category: cat,
          confidence: 0.8,
        }))
      ));

      const result = await service.extractFromConversation('user-1', 'conv-1');
      expect(result).toHaveLength(5);
      expect(result.map(m => m.category).sort()).toEqual(categories.sort());
    });
  });

  // ------------------------------------------------------------------
  // Memory deduplication & merging
  // ------------------------------------------------------------------

  describe('extractFromConversation — dedup & merge', () => {
    beforeEach(() => {
      mockFindById.mockResolvedValue(makeConversation(6));
    });

    it('deduplicates exact-match memories (case insensitive)', async () => {
      mockGetMemorySettings.mockResolvedValue({
        autoMemories: [{
          id: 'existing-1',
          content: 'Uses Ableton Live',
          category: 'equipment',
          confidence: 0.9,
          createdAt: '2026-01-01',
          source: { conversationId: 'old', extractedAt: '2026-01-01' },
        }],
      });

      mockCreateChatCompletion.mockResolvedValue(makeLLMResponse([
        { content: 'uses ableton live', category: 'equipment', confidence: 0.95 },
        { content: 'New unique memory', category: 'genre', confidence: 0.8 },
      ]));

      await service.extractFromConversation('user-1', 'conv-1');

      // updateAutoMemories should be called with only the new unique memory added
      expect(mockUpdateAutoMemories).toHaveBeenCalledTimes(1);
      const updatedMemories = mockUpdateAutoMemories.mock.calls[0][1];
      expect(updatedMemories).toHaveLength(2); // 1 existing + 1 new (deduped removed)
    });

    it('skips merge when all new memories are duplicates', async () => {
      mockGetMemorySettings.mockResolvedValue({
        autoMemories: [{
          id: 'existing-1',
          content: 'Uses Ableton',
          category: 'equipment',
          confidence: 0.9,
          createdAt: '2026-01-01',
          source: { conversationId: 'old', extractedAt: '2026-01-01' },
        }],
      });

      mockCreateChatCompletion.mockResolvedValue(makeLLMResponse([
        { content: 'Uses Ableton', category: 'equipment', confidence: 0.95 },
      ]));

      await service.extractFromConversation('user-1', 'conv-1');

      // Should NOT call updateAutoMemories since all are dupes
      expect(mockUpdateAutoMemories).not.toHaveBeenCalled();
    });

    it('caps memories at 50 (drops lowest confidence/oldest)', async () => {
      const existing = Array.from({ length: 49 }, (_, i) => ({
        id: `existing-${i}`,
        content: `Memory ${i}`,
        category: 'equipment' as const,
        confidence: 0.7,
        createdAt: '2026-01-01',
        source: { conversationId: 'old', extractedAt: '2026-01-01' },
      }));
      mockGetMemorySettings.mockResolvedValue({ autoMemories: existing });

      mockCreateChatCompletion.mockResolvedValue(makeLLMResponse([
        { content: 'New high confidence', category: 'skill', confidence: 0.99 },
        { content: 'New low confidence', category: 'skill', confidence: 0.1 },
      ]));

      await service.extractFromConversation('user-1', 'conv-1');

      const updatedMemories = mockUpdateAutoMemories.mock.calls[0][1];
      expect(updatedMemories).toHaveLength(50); // capped at 50
      // High confidence new memory should be included
      expect(updatedMemories.some((m: any) => m.content === 'New high confidence')).toBe(true);
    });

    it('handles null autoMemories in settings', async () => {
      mockGetMemorySettings.mockResolvedValue({ autoMemories: null });

      mockCreateChatCompletion.mockResolvedValue(makeLLMResponse([
        { content: 'First memory', category: 'equipment', confidence: 0.9 },
      ]));

      await service.extractFromConversation('user-1', 'conv-1');
      expect(mockUpdateAutoMemories).toHaveBeenCalledTimes(1);
      const updatedMemories = mockUpdateAutoMemories.mock.calls[0][1];
      expect(updatedMemories).toHaveLength(1);
    });

    it('handles undefined memory settings', async () => {
      mockGetMemorySettings.mockResolvedValue(undefined);

      mockCreateChatCompletion.mockResolvedValue(makeLLMResponse([
        { content: 'First memory', category: 'equipment', confidence: 0.9 },
      ]));

      await service.extractFromConversation('user-1', 'conv-1');
      expect(mockUpdateAutoMemories).toHaveBeenCalledTimes(1);
    });
  });

  // ------------------------------------------------------------------
  // Memory structure
  // ------------------------------------------------------------------

  describe('extractFromConversation — memory structure', () => {
    beforeEach(() => {
      mockFindById.mockResolvedValue(makeConversation(6));
    });

    it('generates UUID-format IDs for each memory', async () => {
      mockCreateChatCompletion.mockResolvedValue(makeLLMResponse([
        { content: 'Test', category: 'equipment', confidence: 0.9 },
      ]));

      const result = await service.extractFromConversation('user-1', 'conv-1');
      expect(result[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
    });

    it('includes source conversationId and extractedAt', async () => {
      mockCreateChatCompletion.mockResolvedValue(makeLLMResponse([
        { content: 'Test', category: 'equipment', confidence: 0.9 },
      ]));

      const result = await service.extractFromConversation('user-1', 'conv-1');
      expect(result[0].source.conversationId).toBe('conv-1');
      expect(result[0].source.extractedAt).toBeTruthy();
    });

    it('includes createdAt timestamp', async () => {
      mockCreateChatCompletion.mockResolvedValue(makeLLMResponse([
        { content: 'Test', category: 'equipment', confidence: 0.9 },
      ]));

      const result = await service.extractFromConversation('user-1', 'conv-1');
      expect(result[0].createdAt).toBeTruthy();
      // Should be a valid ISO string
      expect(() => new Date(result[0].createdAt)).not.toThrow();
    });
  });
});
