/**
 * HooConversationsRepository Unit Tests
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
  hooConversations: {
    id: 'id',
    userId: 'user_id',
    title: 'title',
    messages: 'messages',
    messageCount: 'message_count',
    model: 'model',
    provider: 'provider',
    totalInputTokens: 'total_input_tokens',
    totalOutputTokens: 'total_output_tokens',
    totalCostUsd: 'total_cost_usd',
    startedAt: 'started_at',
    lastMessageAt: 'last_message_at',
    summary: 'summary',
    tags: 'tags',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
}));

vi.mock('drizzle-orm', () => ({
  desc: vi.fn((col) => col),
  eq: vi.fn((a, b) => ({ a, b })),
  and: vi.fn((...args) => args),
  sql: vi.fn((strings) => strings),
}));

import { HooConversationsRepository } from '@/lib/repositories/hoo-conversations.repository';
import { db } from '@/db/edge';

describe('HooConversationsRepository', () => {
  let repository: HooConversationsRepository;

  const mockConversation = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-123',
    title: 'Test Conversation',
    messages: [
      { role: 'user', content: 'Hello', timestamp: '2026-01-20T00:00:00Z' },
      { role: 'assistant', content: 'Hi there!', timestamp: '2026-01-20T00:00:01Z' },
    ],
    messageCount: 2,
    model: 'claude-haiku-4-5-20251001',
    provider: 'claude',
    totalInputTokens: 100,
    totalOutputTokens: 50,
    totalCostUsd: '0.000150',
    startedAt: new Date(),
    lastMessageAt: new Date(),
    summary: null,
    tags: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    repository = new HooConversationsRepository();
    vi.clearAllMocks();

    // Setup chain mocks for insert
    const mockValues = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([mockConversation]),
    });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

    // Setup chain mocks for select
    const mockLimit = vi.fn().mockResolvedValue([mockConversation]);
    const mockOffset = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit, offset: mockOffset });
    const mockWhere = vi.fn().mockReturnValue({
      limit: mockLimit,
      orderBy: mockOrderBy,
      returning: vi.fn().mockResolvedValue([mockConversation]),
    });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

    // Setup chain mocks for update
    const mockUpdateReturning = vi.fn().mockResolvedValue([mockConversation]);
    const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
    const mockSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

    // Setup chain mocks for delete
    const mockDeleteReturning = vi.fn().mockResolvedValue([mockConversation]);
    const mockDeleteWhere = vi.fn().mockReturnValue({ returning: mockDeleteReturning });
    vi.mocked(db.delete).mockReturnValue({ where: mockDeleteWhere } as never);
  });

  describe('create', () => {
    it('should create a new conversation', async () => {
      const input = {
        userId: 'user-123',
        model: 'claude-haiku-4-5-20251001',
        provider: 'claude' as const,
      };

      const result = await repository.create(input);

      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual(mockConversation);
    });

    it('should create conversation with title', async () => {
      const input = {
        userId: 'user-456',
        model: 'gemini-2.0-flash-exp',
        provider: 'gemini' as const,
        title: 'My Conversation',
      };

      const result = await repository.create(input);

      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual(mockConversation);
    });
  });

  describe('findById', () => {
    it('should return conversation by ID', async () => {
      const result = await repository.findById('123e4567-e89b-12d3-a456-426614174000');

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(mockConversation);
    });

    it('should return null when not found', async () => {
      // Override mock to return empty array
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return conversations for user', async () => {
      const mockConversations = [mockConversation, { ...mockConversation, id: 'conv-2' }];
      const mockLimit = vi.fn().mockReturnValue({
        offset: vi.fn().mockResolvedValue(mockConversations),
      });
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.findByUserId('user-123');

      expect(db.select).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should support limit and offset', async () => {
      const mockLimit = vi.fn().mockReturnValue({
        offset: vi.fn().mockResolvedValue([mockConversation]),
      });
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.findByUserId('user-123', 10, 5);

      expect(db.select).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('findMostRecent', () => {
    it('should return most recent conversation', async () => {
      const result = await repository.findMostRecent('user-123');

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(mockConversation);
    });

    it('should return null when no conversations', async () => {
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.findMostRecent('user-no-conv');

      expect(result).toBeNull();
    });
  });

  describe('addMessage', () => {
    it('should add message to conversation', async () => {
      // Setup findById to return existing conversation
      const mockLimit = vi.fn().mockResolvedValue([mockConversation]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const input = {
        conversationId: mockConversation.id,
        role: 'user' as const,
        content: 'New message',
        inputTokens: 10,
        outputTokens: 0,
        costUsd: 0,
      };

      const result = await repository.addMessage(input);

      expect(db.update).toHaveBeenCalled();
      expect(result).toBeTruthy();
    });

    it('should throw error when conversation not found', async () => {
      // Setup findById to return null
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const input = {
        conversationId: 'non-existent',
        role: 'user' as const,
        content: 'Message',
      };

      await expect(repository.addMessage(input)).rejects.toThrow('Conversation not found');
    });
  });

  describe('updateTitle', () => {
    it('should update conversation title', async () => {
      const result = await repository.updateTitle(mockConversation.id, 'New Title');

      expect(db.update).toHaveBeenCalled();
      expect(result).toBeTruthy();
    });
  });

  describe('updateSummary', () => {
    it('should update conversation summary', async () => {
      const result = await repository.updateSummary(
        mockConversation.id,
        'Summary text',
        ['tag1', 'tag2']
      );

      expect(db.update).toHaveBeenCalled();
      expect(result).toBeTruthy();
    });
  });

  describe('delete', () => {
    it('should delete conversation', async () => {
      const result = await repository.delete(mockConversation.id);

      expect(db.delete).toHaveBeenCalled();
      expect(result).toEqual(mockConversation);
    });

    it('should return null when conversation not found', async () => {
      const mockDeleteReturning = vi.fn().mockResolvedValue([]);
      const mockDeleteWhere = vi.fn().mockReturnValue({ returning: mockDeleteReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockDeleteWhere } as never);

      const result = await repository.delete('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('deleteAllByUserId', () => {
    it('should delete all conversations for user', async () => {
      const mockDeleteReturning = vi.fn().mockResolvedValue([mockConversation]);
      const mockDeleteWhere = vi.fn().mockReturnValue({ returning: mockDeleteReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockDeleteWhere } as never);

      const result = await repository.deleteAllByUserId('user-123');

      expect(db.delete).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('countByUserId', () => {
    it('should return conversation count for user', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 5 }]),
      });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.countByUserId('user-123');

      expect(result).toBe(5);
    });

    it('should return 0 when no conversations', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.countByUserId('user-no-conv');

      expect(result).toBe(0);
    });
  });

  describe('getUserStats', () => {
    it('should return user stats', async () => {
      const mockStats = {
        totalConversations: 10,
        totalMessages: 100,
        totalInputTokens: 5000,
        totalOutputTokens: 3000,
        totalCostUsd: '0.500000',
      };

      const mockFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockStats]),
      });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.getUserStats('user-123');

      expect(result).toEqual({
        totalConversations: 10,
        totalMessages: 100,
        totalInputTokens: 5000,
        totalOutputTokens: 3000,
        totalCostUsd: 0.5,
      });
    });

    it('should return zeros when no data', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{}]),
      });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.getUserStats('user-no-data');

      expect(result).toEqual({
        totalConversations: 0,
        totalMessages: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCostUsd: 0,
      });
    });
  });
});
