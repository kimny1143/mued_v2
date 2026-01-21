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
import { muednoteDawLogs, type DawAction, type DawType } from '@/db/schema/muednote-daw-logs';
import { dawLogsRepository } from '@/lib/repositories/daw-logs.repository';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';

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
    midi_note_on: number;
    midi_note_off: number;
    midi_control_change: number;
    midi_pitch_bend: number;
  };
  /** Count of OSC logs (parameter_change, track_volume, track_pan) */
  oscCount: number;
  /** Count of MIDI logs (note_on, note_off, control_change, pitch_bend) */
  midiCount: number;
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
        midi_note_on: 0,
        midi_note_off: 0,
        midi_control_change: 0,
        midi_pitch_bend: 0,
      },
      oscCount: 0,
      midiCount: 0,
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
        case 'midi_note_on':
          stats.byAction.midi_note_on++;
          stats.midiCount++;
          break;
        case 'midi_note_off':
          stats.byAction.midi_note_off++;
          stats.midiCount++;
          break;
        case 'midi_control_change':
          stats.byAction.midi_control_change++;
          stats.midiCount++;
          break;
        case 'midi_pitch_bend':
          stats.byAction.midi_pitch_bend++;
          stats.midiCount++;
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
}

// ========================================
// Singleton Instance
// ========================================

export const dawSessionMatcher = new DawSessionMatcherService();
