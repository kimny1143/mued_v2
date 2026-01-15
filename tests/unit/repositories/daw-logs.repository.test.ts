/**
 * DawLogsRepository Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database - must be defined before import
vi.mock('@/db', () => {
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

vi.mock('@/db/schema/muednote-daw-logs', () => ({
  muednoteDawLogs: {
    id: 'id',
    userId: 'user_id',
    sessionId: 'session_id',
    ts: 'ts',
    daw: 'daw',
    action: 'action',
    trackId: 'track_id',
    deviceId: 'device_id',
    paramId: 'param_id',
    value: 'value',
    valueString: 'value_string',
    metadata: 'metadata',
    createdAt: 'created_at',
  },
}));

vi.mock('drizzle-orm', () => ({
  desc: vi.fn((col) => col),
  eq: vi.fn((a, b) => ({ a, b })),
  and: vi.fn((...args) => args),
  gte: vi.fn((a, b) => ({ a, b, op: 'gte' })),
  lte: vi.fn((a, b) => ({ a, b, op: 'lte' })),
  sql: vi.fn((strings) => strings),
  inArray: vi.fn((col, arr) => ({ col, arr, op: 'inArray' })),
}));

import { DawLogsRepository } from '@/lib/repositories/daw-logs.repository';
import { db } from '@/db';

describe('DawLogsRepository', () => {
  let repository: DawLogsRepository;

  const mockDawLog = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user_123',
    sessionId: null,
    ts: new Date('2026-01-11T10:00:00Z'),
    daw: 'ableton',
    action: 'track_volume',
    trackId: 0,
    deviceId: -1,
    paramId: 0,
    value: 0.7,
    valueString: '-3.1 dB',
    metadata: null,
    createdAt: new Date(),
  };

  beforeEach(() => {
    repository = new DawLogsRepository();
    vi.clearAllMocks();

    // Setup chain mocks for insert
    const mockValues = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([mockDawLog]),
    });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

    // Setup chain mocks for select
    const mockLimit = vi.fn().mockResolvedValue([mockDawLog]);
    const mockOffset = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit, offset: mockOffset });
    const mockWhere = vi.fn().mockReturnValue({
      limit: mockLimit,
      orderBy: mockOrderBy,
    });
    const mockFrom = vi.fn().mockReturnValue({
      where: mockWhere,
      orderBy: mockOrderBy,
    });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

    // Setup chain mocks for update
    const mockUpdateReturning = vi.fn().mockResolvedValue([mockDawLog]);
    const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
    const mockSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

    // Setup chain mocks for delete
    const mockDeleteReturning = vi.fn().mockResolvedValue([mockDawLog]);
    const mockDeleteWhere = vi.fn().mockReturnValue({ returning: mockDeleteReturning });
    vi.mocked(db.delete).mockReturnValue({ where: mockDeleteWhere } as never);
  });

  describe('create', () => {
    it('should create a new DAW log with minimal input', async () => {
      const input = {
        userId: 'user_123',
        ts: new Date('2026-01-11T10:00:00Z'),
        trackId: 0,
        deviceId: -1,
        paramId: 0,
        value: 0.7,
        valueString: '-3.1 dB',
      };

      const result = await repository.create(input);

      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual(mockDawLog);
    });

    it('should create a DAW log with all fields', async () => {
      const input = {
        userId: 'user_123',
        sessionId: 'session_456',
        ts: new Date('2026-01-11T10:00:00Z'),
        daw: 'ableton' as const,
        action: 'parameter_change' as const,
        trackId: 1,
        deviceId: 0,
        paramId: 5,
        value: 0.5,
        valueString: '500 Hz',
        metadata: { deviceName: 'EQ Eight' },
      };

      const result = await repository.create(input);

      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual(mockDawLog);
    });
  });

  describe('createBatch', () => {
    it('should return inserted count of 0 for empty array', async () => {
      const result = await repository.createBatch([]);

      expect(db.insert).not.toHaveBeenCalled();
      expect(result).toEqual({ inserted: 0 });
    });

    it('should batch insert multiple logs', async () => {
      const mockReturning = vi.fn().mockResolvedValue([
        { id: 'id1' },
        { id: 'id2' },
      ]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const inputs = [
        {
          userId: 'user_123',
          ts: new Date(),
          trackId: 0,
          deviceId: -1,
          paramId: 0,
          value: 0.7,
          valueString: '-3.1 dB',
        },
        {
          userId: 'user_123',
          ts: new Date(),
          trackId: 1,
          deviceId: -1,
          paramId: 0,
          value: 0.8,
          valueString: '-1.9 dB',
        },
      ];

      const result = await repository.createBatch(inputs);

      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual({ inserted: 2 });
    });
  });

  describe('getById', () => {
    it('should return log when found', async () => {
      const result = await repository.getById(mockDawLog.id);

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(mockDawLog);
    });

    it('should return null when not found', async () => {
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.getById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('getLogs', () => {
    it('should return logs with basic filters', async () => {
      // Setup mock that returns array when awaited (uses Symbol.toStringTag for thenable)
      const mockResult = [mockDawLog];
      const mockOrderBy = vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        then: (resolve: (v: typeof mockResult) => void) => resolve(mockResult),
      });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.getLogs({ userId: 'user_123' });

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should apply time range filters', async () => {
      const mockResult = [mockDawLog];
      const limitMock = vi.fn().mockReturnValue({
        offset: vi.fn().mockReturnThis(),
        then: (resolve: (v: typeof mockResult) => void) => resolve(mockResult),
      });
      const mockOrderBy = vi.fn().mockReturnValue({
        limit: limitMock,
        offset: vi.fn().mockReturnThis(),
        then: (resolve: (v: typeof mockResult) => void) => resolve(mockResult),
      });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.getLogs({
        userId: 'user_123',
        since: new Date('2026-01-01'),
        until: new Date('2026-01-31'),
        limit: 100,
      });

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe('getByTimeRange', () => {
    it('should return logs within time range', async () => {
      const result = await repository.getByTimeRange(
        'user_123',
        new Date('2026-01-11T09:00:00Z'),
        new Date('2026-01-11T11:00:00Z')
      );

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual([mockDawLog]);
    });
  });

  describe('getBySessionId', () => {
    it('should return logs for session', async () => {
      const result = await repository.getBySessionId('session_123');

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual([mockDawLog]);
    });
  });

  describe('countByTimeRange', () => {
    it('should return count of logs in time range', async () => {
      const mockWhere = vi.fn().mockResolvedValue([{ count: 42 }]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.countByTimeRange(
        'user_123',
        new Date('2026-01-11T09:00:00Z'),
        new Date('2026-01-11T11:00:00Z')
      );

      expect(result).toBe(42);
    });

    it('should return 0 when no logs found', async () => {
      const mockWhere = vi.fn().mockResolvedValue([{ count: 0 }]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.countByTimeRange(
        'user_123',
        new Date('2026-01-11T09:00:00Z'),
        new Date('2026-01-11T11:00:00Z')
      );

      expect(result).toBe(0);
    });
  });

  describe('linkToSession', () => {
    it('should return 0 for empty log IDs array', async () => {
      const result = await repository.linkToSession([], 'session_123');

      expect(db.update).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it('should update session ID for logs', async () => {
      const mockReturning = vi.fn().mockResolvedValue([
        { id: 'id1' },
        { id: 'id2' },
      ]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const result = await repository.linkToSession(
        ['log_1', 'log_2'],
        'session_123'
      );

      expect(db.update).toHaveBeenCalled();
      expect(result).toBe(2);
    });
  });

  describe('deleteById', () => {
    it('should delete log and return true', async () => {
      const result = await repository.deleteById(mockDawLog.id);

      expect(db.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when log not found', async () => {
      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const result = await repository.deleteById('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('deleteByTimeRange', () => {
    it('should delete logs in time range and return count', async () => {
      const mockReturning = vi.fn().mockResolvedValue([
        { id: 'id1' },
        { id: 'id2' },
        { id: 'id3' },
      ]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const result = await repository.deleteByTimeRange(
        'user_123',
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(db.delete).toHaveBeenCalled();
      expect(result).toBe(3);
    });
  });
});
