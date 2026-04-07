/**
 * DawSessionMatcherService Unit Tests
 *
 * Tests the pure clustering/stats logic:
 * - clusterDawLogs: groups orphan logs into virtual sessions by time gap
 * - buildVirtualSession: creates session metadata from a cluster
 * - getStatsForSession: action counting logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ========================================
// Mocks — DB & repository calls
// ========================================

vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
}));

vi.mock('@/db/schema/muednote-mobile', () => ({
  muednoteMobileSessions: { id: 'id', userId: 'user_id', startedAt: 'started_at', endedAt: 'ended_at' },
}));

vi.mock('@/db/schema/muednote-daw-logs', () => ({
  // Just type exports, no runtime needed
}));

vi.mock('@/lib/repositories/daw-logs.repository', () => ({
  dawLogsRepository: {
    getByTimeRange: vi.fn().mockResolvedValue([]),
    countByTimeRange: vi.fn().mockResolvedValue(0),
    getOrphanLogs: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  inArray: vi.fn(),
}));

import {
  DawSessionMatcherService,
} from '@/lib/services/daw-session-matcher.service';

// ========================================
// Helper: create mock DAW logs
// ========================================

function makeLogs(
  timestamps: number[],
  daw = 'ableton',
  action = 'parameter_change'
) {
  return timestamps.map((ts, i) => ({
    id: `log-${i}`,
    ts: new Date(ts),
    daw,
    action,
    trackId: 1,
    deviceId: 0,
    paramId: 0,
    value: 0.5,
    valueString: '0.5',
  }));
}

// ========================================
// Tests
// ========================================

describe('DawSessionMatcherService', () => {
  let service: DawSessionMatcherService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new DawSessionMatcherService();
  });

  // ------------------------------------------------------------------
  // getVirtualDawSessions (clustering)
  // ------------------------------------------------------------------

  describe('getVirtualDawSessions', () => {
    it('returns empty array when no orphan logs', async () => {
      const { dawLogsRepository } = await import('@/lib/repositories/daw-logs.repository');
      vi.mocked(dawLogsRepository.getOrphanLogs).mockResolvedValue([]);

      const result = await service.getVirtualDawSessions('user-1');
      expect(result).toEqual([]);
    });

    it('clusters a single log into one virtual session', async () => {
      const { dawLogsRepository } = await import('@/lib/repositories/daw-logs.repository');
      const base = Date.now();
      vi.mocked(dawLogsRepository.getOrphanLogs).mockResolvedValue(
        makeLogs([base]) as any
      );

      const result = await service.getVirtualDawSessions('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('daw-only');
      expect(result[0].logCount).toBe(1);
      expect(result[0].id).toBe(`daw-virtual-${base}`);
    });

    it('groups logs within 5 min gap into one session', async () => {
      const { dawLogsRepository } = await import('@/lib/repositories/daw-logs.repository');
      const base = Date.now();
      // 0, +1min, +2min, +3min — all within 5 min gap
      const logs = makeLogs([
        base,
        base + 60_000,
        base + 120_000,
        base + 180_000,
      ]);
      vi.mocked(dawLogsRepository.getOrphanLogs).mockResolvedValue(logs as any);

      const result = await service.getVirtualDawSessions('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].logCount).toBe(4);
      expect(result[0].durationSec).toBe(180);
    });

    it('splits logs into two sessions when gap > 5 min', async () => {
      const { dawLogsRepository } = await import('@/lib/repositories/daw-logs.repository');
      const base = Date.now();
      // Cluster 1: 0, +1min. Cluster 2: +10min, +11min (gap > 5 min)
      const logs = makeLogs([
        base,
        base + 60_000,
        base + 600_000,
        base + 660_000,
      ]);
      vi.mocked(dawLogsRepository.getOrphanLogs).mockResolvedValue(logs as any);

      const result = await service.getVirtualDawSessions('user-1');
      expect(result).toHaveLength(2);
      expect(result[0].logCount).toBe(2);
      expect(result[1].logCount).toBe(2);
    });

    it('handles unsorted logs by sorting them first', async () => {
      const { dawLogsRepository } = await import('@/lib/repositories/daw-logs.repository');
      const base = Date.now();
      // Deliberately unsorted
      const logs = makeLogs([
        base + 120_000,
        base,
        base + 60_000,
      ]);
      vi.mocked(dawLogsRepository.getOrphanLogs).mockResolvedValue(logs as any);

      const result = await service.getVirtualDawSessions('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].logCount).toBe(3);
      expect(result[0].startedAt.getTime()).toBe(base);
    });

    it('assigns correct DAW type from first log in cluster', async () => {
      const { dawLogsRepository } = await import('@/lib/repositories/daw-logs.repository');
      const base = Date.now();
      const logs = makeLogs([base, base + 30_000], 'logic_pro');
      vi.mocked(dawLogsRepository.getOrphanLogs).mockResolvedValue(logs as any);

      const result = await service.getVirtualDawSessions('user-1');
      expect(result[0].daw).toBe('logic_pro');
    });

    it('creates deterministic IDs based on cluster start time', async () => {
      const { dawLogsRepository } = await import('@/lib/repositories/daw-logs.repository');
      const base = 1700000000000;
      const logs = makeLogs([base, base + 60_000]);
      vi.mocked(dawLogsRepository.getOrphanLogs).mockResolvedValue(logs as any);

      const result = await service.getVirtualDawSessions('user-1');
      expect(result[0].id).toBe('daw-virtual-1700000000000');
    });

    it('calculates action summary correctly', async () => {
      const { dawLogsRepository } = await import('@/lib/repositories/daw-logs.repository');
      const base = Date.now();
      const logs = [
        ...makeLogs([base], 'ableton', 'track_volume'),
        ...makeLogs([base + 1000], 'ableton', 'track_volume'),
        ...makeLogs([base + 2000], 'ableton', 'track_pan'),
      ];
      vi.mocked(dawLogsRepository.getOrphanLogs).mockResolvedValue(logs as any);

      const result = await service.getVirtualDawSessions('user-1');
      expect(result[0].actionSummary).toEqual({
        track_volume: 2,
        track_pan: 1,
      });
    });

    it('handles three distinct clusters', async () => {
      const { dawLogsRepository } = await import('@/lib/repositories/daw-logs.repository');
      const base = Date.now();
      const GAP = 6 * 60 * 1000; // 6 min > 5 min threshold
      const logs = makeLogs([
        base,
        base + 30_000,
        base + GAP,
        base + GAP + 30_000,
        base + GAP * 2,
      ]);
      vi.mocked(dawLogsRepository.getOrphanLogs).mockResolvedValue(logs as any);

      const result = await service.getVirtualDawSessions('user-1');
      expect(result).toHaveLength(3);
      expect(result[0].logCount).toBe(2);
      expect(result[1].logCount).toBe(2);
      expect(result[2].logCount).toBe(1);
    });

    it('ensures minimum duration of 1 second for single-log clusters', async () => {
      const { dawLogsRepository } = await import('@/lib/repositories/daw-logs.repository');
      const base = Date.now();
      vi.mocked(dawLogsRepository.getOrphanLogs).mockResolvedValue(
        makeLogs([base]) as any
      );

      const result = await service.getVirtualDawSessions('user-1');
      expect(result[0].durationSec).toBe(1);
    });

    it('sets userId from input parameter', async () => {
      const { dawLogsRepository } = await import('@/lib/repositories/daw-logs.repository');
      vi.mocked(dawLogsRepository.getOrphanLogs).mockResolvedValue(
        makeLogs([Date.now()]) as any
      );

      const result = await service.getVirtualDawSessions('user-abc-123');
      expect(result[0].userId).toBe('user-abc-123');
    });
  });

  // ------------------------------------------------------------------
  // getVirtualDawSessionById
  // ------------------------------------------------------------------

  describe('getVirtualDawSessionById', () => {
    it('returns null for invalid ID format', async () => {
      const result = await service.getVirtualDawSessionById('invalid-id', 'user-1');
      expect(result).toBeNull();
    });

    it('returns null for ID with wrong prefix', async () => {
      const result = await service.getVirtualDawSessionById('session-virtual-123', 'user-1');
      expect(result).toBeNull();
    });

    it('returns null when no orphan logs exist', async () => {
      const { dawLogsRepository } = await import('@/lib/repositories/daw-logs.repository');
      vi.mocked(dawLogsRepository.getOrphanLogs).mockResolvedValue([]);

      const result = await service.getVirtualDawSessionById('daw-virtual-1700000000000', 'user-1');
      expect(result).toBeNull();
    });

    it('returns null when target cluster not found', async () => {
      const { dawLogsRepository } = await import('@/lib/repositories/daw-logs.repository');
      const base = Date.now();
      vi.mocked(dawLogsRepository.getOrphanLogs).mockResolvedValue(
        makeLogs([base]) as any
      );

      const result = await service.getVirtualDawSessionById('daw-virtual-9999999999999', 'user-1');
      expect(result).toBeNull();
    });

    it('returns session and logs when cluster is found', async () => {
      const { dawLogsRepository } = await import('@/lib/repositories/daw-logs.repository');
      const base = 1700000000000;
      const logs = makeLogs([base, base + 30_000, base + 60_000]);
      vi.mocked(dawLogsRepository.getOrphanLogs).mockResolvedValue(logs as any);

      const result = await service.getVirtualDawSessionById(`daw-virtual-${base}`, 'user-1');
      expect(result).not.toBeNull();
      expect(result!.session.id).toBe(`daw-virtual-${base}`);
      expect(result!.logs).toHaveLength(3);
    });

    it('returns logs with relative time in seconds', async () => {
      const { dawLogsRepository } = await import('@/lib/repositories/daw-logs.repository');
      const base = 1700000000000;
      const logs = makeLogs([base, base + 15_000, base + 45_000]);
      vi.mocked(dawLogsRepository.getOrphanLogs).mockResolvedValue(logs as any);

      const result = await service.getVirtualDawSessionById(`daw-virtual-${base}`, 'user-1');
      expect(result!.logs[0].relativeTimeSec).toBe(0);
      expect(result!.logs[1].relativeTimeSec).toBe(15);
      expect(result!.logs[2].relativeTimeSec).toBe(45);
    });
  });

  // ------------------------------------------------------------------
  // getLogCountsForSessions (no DB call for empty input)
  // ------------------------------------------------------------------

  describe('getLogCountsForSessions', () => {
    it('returns empty map for empty input', async () => {
      const result = await service.getLogCountsForSessions([]);
      expect(result.size).toBe(0);
    });
  });
});
