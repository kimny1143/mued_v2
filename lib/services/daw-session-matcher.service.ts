/**
 * DawSessionMatcherService
 *
 * Matches DAW logs to mobile sessions by time overlap.
 * Algorithm: session.started_at <= daw_log.ts <= session.ended_at
 *
 * Used by:
 * - Session detail page to display DAW logs alongside voice logs
 * - Sessions list to show DAW log counts
 */

import { db } from '@/db';
import { muednoteMobileSessions } from '@/db/schema/muednote-mobile';
import { type DawAction, type DawType } from '@/db/schema/muednote-daw-logs';
import { dawLogsRepository } from '@/lib/repositories/daw-logs.repository';
import { eq, inArray } from 'drizzle-orm';

// ========================================
// Types
// ========================================

export interface DawLogForSession {
  id: string;
  ts: Date;
  daw: DawType;
  action: DawAction;
  trackId: number;
  deviceId: number;
  paramId: number;
  value: number;
  valueString: string;
  /** Seconds from session start (for timeline display) */
  relativeTimeSec: number;
}

export interface DawStatsForSession {
  totalLogs: number;
  byAction: {
    parameter_change: number;
    track_volume: number;
    track_pan: number;
    track_select: number;
    clip_trigger: number;
    device_config_change: number;
  };
  /** Count of OSC logs */
  oscCount: number;
}

export interface SessionWithDawLogs {
  sessionId: string;
  startedAt: Date;
  endedAt: Date | null;
  dawLogs: DawLogForSession[];
  stats: DawStatsForSession;
}

// ========================================
// Service Implementation
// ========================================

export class DawSessionMatcherService {
  /**
   * Get DAW logs that overlap with a session's time range
   * Returns logs with relative timestamps for timeline display
   */
  async getLogsForSession(sessionId: string, limit: number = 500): Promise<DawLogForSession[]> {
    // Get session to find time range
    const [session] = await db
      .select()
      .from(muednoteMobileSessions)
      .where(eq(muednoteMobileSessions.id, sessionId))
      .limit(1);

    if (!session) {
      return [];
    }

    // Session must have started
    const startedAt = session.startedAt;
    if (!startedAt) {
      return [];
    }

    // Use ended_at if available, otherwise use current time (for active sessions)
    const endedAt = session.endedAt ?? new Date();

    // Get DAW logs in this time range
    const logs = await dawLogsRepository.getByTimeRange(
      session.userId,
      startedAt,
      endedAt,
      limit
    );

    // Convert to session-relative format
    const startTime = startedAt.getTime();

    return logs.map((log) => ({
      id: log.id,
      ts: log.ts,
      daw: log.daw as DawType,
      action: log.action as DawAction,
      trackId: log.trackId,
      deviceId: log.deviceId,
      paramId: log.paramId,
      value: log.value,
      valueString: log.valueString,
      relativeTimeSec: (log.ts.getTime() - startTime) / 1000,
    }));
  }

  /**
   * Get DAW log statistics for a session
   */
  async getStatsForSession(sessionId: string): Promise<DawStatsForSession> {
    const logs = await this.getLogsForSession(sessionId, 10000);

    const stats: DawStatsForSession = {
      totalLogs: logs.length,
      byAction: {
        parameter_change: 0,
        track_volume: 0,
        track_pan: 0,
        track_select: 0,
        clip_trigger: 0,
        device_config_change: 0,
      },
      oscCount: 0,
    };

    for (const log of logs) {
      switch (log.action) {
        case 'parameter_change':
          stats.byAction.parameter_change++;
          stats.oscCount++;
          break;
        case 'track_volume':
          stats.byAction.track_volume++;
          stats.oscCount++;
          break;
        case 'track_pan':
          stats.byAction.track_pan++;
          stats.oscCount++;
          break;
        case 'track_select':
          stats.byAction.track_select++;
          stats.oscCount++;
          break;
        case 'clip_trigger':
          stats.byAction.clip_trigger++;
          stats.oscCount++;
          break;
        case 'device_config_change':
          stats.byAction.device_config_change++;
          stats.oscCount++;
          break;
      }
    }

    return stats;
  }

  /**
   * Get DAW log count for a session (efficient for list views)
   */
  async getLogCountForSession(sessionId: string): Promise<number> {
    const [session] = await db
      .select()
      .from(muednoteMobileSessions)
      .where(eq(muednoteMobileSessions.id, sessionId))
      .limit(1);

    if (!session || !session.startedAt) {
      return 0;
    }

    const endedAt = session.endedAt ?? new Date();

    return await dawLogsRepository.countByTimeRange(
      session.userId,
      session.startedAt,
      endedAt
    );
  }

  /**
   * Get DAW log counts for multiple sessions (batch query)
   * More efficient than calling getLogCountForSession for each session
   */
  async getLogCountsForSessions(
    sessionIds: string[]
  ): Promise<Map<string, number>> {
    if (sessionIds.length === 0) {
      return new Map();
    }

    // Get all sessions
    const sessions = await db
      .select()
      .from(muednoteMobileSessions)
      .where(inArray(muednoteMobileSessions.id, sessionIds));

    const counts = new Map<string, number>();

    // For each session, count DAW logs in its time range
    // This could be optimized with a single query using CASE/WHEN but
    // keeping it simple for now
    for (const session of sessions) {
      if (!session.startedAt) {
        counts.set(session.id, 0);
        continue;
      }

      const endedAt = session.endedAt ?? new Date();
      const count = await dawLogsRepository.countByTimeRange(
        session.userId,
        session.startedAt,
        endedAt
      );
      counts.set(session.id, count);
    }

    return counts;
  }

  /**
   * Get complete session data with DAW logs
   */
  async getSessionWithDawLogs(sessionId: string): Promise<SessionWithDawLogs | null> {
    const [session] = await db
      .select()
      .from(muednoteMobileSessions)
      .where(eq(muednoteMobileSessions.id, sessionId))
      .limit(1);

    if (!session || !session.startedAt) {
      return null;
    }

    const [dawLogs, stats] = await Promise.all([
      this.getLogsForSession(sessionId),
      this.getStatsForSession(sessionId),
    ]);

    return {
      sessionId: session.id,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      dawLogs,
      stats,
    };
  }
  // ========================================
  // Virtual DAW Sessions (orphan log clustering)
  // ========================================

  /**
   * Cluster orphan DAW logs into virtual "DAW-only" sessions.
   * Logs separated by more than GAP_MS are split into separate clusters.
   */
  async getVirtualDawSessions(userId: string, limit: number = 1000): Promise<VirtualDawSession[]> {
    const orphans = await dawLogsRepository.getOrphanLogs(userId, limit);
    if (orphans.length === 0) return [];

    return clusterDawLogs(orphans, userId);
  }

  /**
   * Get a specific virtual DAW session by its deterministic ID.
   * Returns the session info + full DAW logs for the detail page.
   */
  async getVirtualDawSessionById(
    virtualId: string,
    userId: string
  ): Promise<{ session: VirtualDawSession; logs: DawLogForSession[] } | null> {
    // Parse epoch from ID: "daw-virtual-{epoch}"
    const match = virtualId.match(/^daw-virtual-(\d+)$/);
    if (!match) return null;

    const epoch = parseInt(match[1], 10);
    // Query a window around the epoch to find the cluster
    const windowStart = new Date(epoch - CLUSTER_GAP_MS);
    const windowEnd = new Date(epoch + 24 * 60 * 60 * 1000); // +24h generous window

    const logs = await dawLogsRepository.getOrphanLogs(userId, 5000);
    if (logs.length === 0) return null;

    const clusters = clusterDawLogs(logs, userId);
    const target = clusters.find((c) => c.id === virtualId);
    if (!target) return null;

    // Get the actual logs for this cluster's time range
    const clusterLogs = logs
      .filter((l) => l.ts >= target.startedAt && l.ts <= target.endedAt)
      .map((log) => ({
        id: log.id,
        ts: log.ts,
        daw: log.daw as DawType,
        action: log.action as DawAction,
        trackId: log.trackId,
        deviceId: log.deviceId,
        paramId: log.paramId,
        value: log.value,
        valueString: log.valueString,
        relativeTimeSec: (log.ts.getTime() - target.startedAt.getTime()) / 1000,
      }));

    return { session: target, logs: clusterLogs };
  }
}

// ========================================
// Virtual DAW Session Types & Clustering
// ========================================

/** 5 minutes gap = new cluster */
const CLUSTER_GAP_MS = 5 * 60 * 1000;

export interface VirtualDawSession {
  id: string;
  type: 'daw-only';
  userId: string;
  startedAt: Date;
  endedAt: Date;
  durationSec: number;
  logCount: number;
  daw: DawType;
  actionSummary: Partial<Record<string, number>>;
}

function clusterDawLogs(
  logs: { ts: Date; daw: string; action: string }[],
  userId: string
): VirtualDawSession[] {
  if (logs.length === 0) return [];

  const sorted = [...logs].sort((a, b) => a.ts.getTime() - b.ts.getTime());
  const clusters: VirtualDawSession[] = [];

  let clusterStart = sorted[0].ts;
  let clusterEnd = sorted[0].ts;
  let clusterLogs = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].ts.getTime() - clusterEnd.getTime();
    if (gap > CLUSTER_GAP_MS) {
      // Finalize current cluster
      clusters.push(buildVirtualSession(clusterLogs, clusterStart, clusterEnd, userId));
      // Start new cluster
      clusterStart = sorted[i].ts;
      clusterEnd = sorted[i].ts;
      clusterLogs = [sorted[i]];
    } else {
      clusterEnd = sorted[i].ts;
      clusterLogs.push(sorted[i]);
    }
  }
  // Finalize last cluster
  clusters.push(buildVirtualSession(clusterLogs, clusterStart, clusterEnd, userId));

  return clusters;
}

function buildVirtualSession(
  logs: { ts: Date; daw: string; action: string }[],
  startedAt: Date,
  endedAt: Date,
  userId: string
): VirtualDawSession {
  const actionSummary: Record<string, number> = {};
  for (const l of logs) {
    actionSummary[l.action] = (actionSummary[l.action] || 0) + 1;
  }

  return {
    id: `daw-virtual-${startedAt.getTime()}`,
    type: 'daw-only',
    userId,
    startedAt,
    endedAt,
    durationSec: Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)),
    logCount: logs.length,
    daw: (logs[0].daw || 'ableton') as DawType,
    actionSummary,
  };
}

// ========================================
// Singleton Instance
// ========================================

export const dawSessionMatcher = new DawSessionMatcherService();
