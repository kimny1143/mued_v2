/**
 * DawLogsRepository - Data access layer for DAW parameter logs
 *
 * Provides type-safe CRUD operations for muednote_daw_logs table.
 * Used by DAW Hub CLI and dashboard to store/retrieve DAW parameter changes.
 */

import { db } from '@/db';
import {
  muednoteDawLogs,
  type DawLog,
  type DawType,
  type DawAction,
} from '@/db/schema/muednote-daw-logs';
import { desc, eq, and, gte, lte, sql, inArray } from 'drizzle-orm';

// ========================================
// Type Definitions
// ========================================

/**
 * Input for creating a single DAW log
 */
export interface CreateDawLogInput {
  userId: string;
  sessionId?: string;
  ts: Date;
  daw?: DawType;
  action?: DawAction;
  trackId: number;
  deviceId: number;
  paramId: number;
  value: number;
  valueString: string;
  metadata?: Record<string, unknown>;
}

/**
 * Filter options for querying DAW logs
 */
export interface DawLogFilters {
  userId: string;
  sessionId?: string;
  since?: Date;
  until?: Date;
  daw?: DawType;
  action?: DawAction;
  /** Filter by multiple actions (e.g., MIDI or OSC actions) */
  actions?: DawAction[];
  limit?: number;
  offset?: number;
}

/**
 * DAW log statistics for a time range
 */
export interface DawLogStats {
  totalLogs: number;
  byAction: Record<DawAction, number>;
  byDaw: Record<DawType, number>;
}

// ========================================
// DawLogsRepository Class
// ========================================

export class DawLogsRepository {
  // ========================================
  // Create Operations
  // ========================================

  /**
   * Create a single DAW log
   */
  async create(input: CreateDawLogInput): Promise<DawLog> {
    const [log] = await db
      .insert(muednoteDawLogs)
      .values({
        userId: input.userId,
        sessionId: input.sessionId,
        ts: input.ts,
        daw: input.daw ?? 'ableton',
        action: input.action ?? 'parameter_change',
        trackId: input.trackId,
        deviceId: input.deviceId,
        paramId: input.paramId,
        value: input.value,
        valueString: input.valueString,
        metadata: input.metadata ?? null,
      })
      .returning();

    return log;
  }

  /**
   * Create multiple DAW logs in a single transaction (batch insert)
   * More efficient for high-frequency events from DAW Hub
   */
  async createBatch(inputs: CreateDawLogInput[]): Promise<{ inserted: number }> {
    if (inputs.length === 0) {
      return { inserted: 0 };
    }

    const values = inputs.map((input) => ({
      userId: input.userId,
      sessionId: input.sessionId,
      ts: input.ts,
      daw: input.daw ?? 'ableton',
      action: input.action ?? 'parameter_change',
      trackId: input.trackId,
      deviceId: input.deviceId,
      paramId: input.paramId,
      value: input.value,
      valueString: input.valueString,
      metadata: input.metadata ?? null,
    }));

    const result = await db
      .insert(muednoteDawLogs)
      .values(values)
      .returning({ id: muednoteDawLogs.id });

    return { inserted: result.length };
  }

  // ========================================
  // Read Operations
  // ========================================

  /**
   * Get DAW logs by ID
   */
  async getById(logId: string): Promise<DawLog | null> {
    const [log] = await db
      .select()
      .from(muednoteDawLogs)
      .where(eq(muednoteDawLogs.id, logId))
      .limit(1);

    return log ?? null;
  }

  /**
   * Get DAW logs with filters
   */
  async getLogs(filters: DawLogFilters): Promise<DawLog[]> {
    const conditions = [eq(muednoteDawLogs.userId, filters.userId)];

    if (filters.sessionId) {
      conditions.push(eq(muednoteDawLogs.sessionId, filters.sessionId));
    }
    if (filters.since) {
      conditions.push(gte(muednoteDawLogs.ts, filters.since));
    }
    if (filters.until) {
      conditions.push(lte(muednoteDawLogs.ts, filters.until));
    }
    if (filters.daw) {
      conditions.push(eq(muednoteDawLogs.daw, filters.daw));
    }
    if (filters.action) {
      conditions.push(eq(muednoteDawLogs.action, filters.action));
    }
    // Filter by multiple actions (e.g., MIDI or OSC actions)
    if (filters.actions && filters.actions.length > 0) {
      conditions.push(inArray(muednoteDawLogs.action, filters.actions));
    }

    let query = db
      .select()
      .from(muednoteDawLogs)
      .where(and(...conditions))
      .orderBy(desc(muednoteDawLogs.ts));

    if (filters.limit) {
      query = query.limit(filters.limit) as typeof query;
    }
    if (filters.offset) {
      query = query.offset(filters.offset) as typeof query;
    }

    return await query;
  }

  /**
   * Get DAW logs for a session by time range (time-matching)
   * This is the core algorithm for correlating DAW logs with mobile sessions
   */
  async getByTimeRange(
    userId: string,
    since: Date,
    until: Date,
    limit: number = 500
  ): Promise<DawLog[]> {
    return await db
      .select()
      .from(muednoteDawLogs)
      .where(
        and(
          eq(muednoteDawLogs.userId, userId),
          gte(muednoteDawLogs.ts, since),
          lte(muednoteDawLogs.ts, until)
        )
      )
      .orderBy(muednoteDawLogs.ts)
      .limit(limit);
  }

  /**
   * Get DAW logs for a session by sessionId (if explicitly linked)
   */
  async getBySessionId(sessionId: string, limit: number = 500): Promise<DawLog[]> {
    return await db
      .select()
      .from(muednoteDawLogs)
      .where(eq(muednoteDawLogs.sessionId, sessionId))
      .orderBy(muednoteDawLogs.ts)
      .limit(limit);
  }

  /**
   * Count DAW logs in a time range (for session summary)
   */
  async countByTimeRange(userId: string, since: Date, until: Date): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(muednoteDawLogs)
      .where(
        and(
          eq(muednoteDawLogs.userId, userId),
          gte(muednoteDawLogs.ts, since),
          lte(muednoteDawLogs.ts, until)
        )
      );

    return Number(result?.count ?? 0);
  }

  /**
   * Get orphan DAW logs (not within any session's time range)
   * Used for building virtual DAW-only sessions
   */
  async getOrphanLogs(userId: string, limit: number = 1000): Promise<DawLog[]> {
    return await db
      .select()
      .from(muednoteDawLogs)
      .where(
        and(
          eq(muednoteDawLogs.userId, userId),
          sql`NOT EXISTS (
            SELECT 1 FROM muednote_mobile_sessions ms
            WHERE ms.user_id = ${muednoteDawLogs.userId}
              AND ms.started_at <= ${muednoteDawLogs.ts}
              AND ms.ended_at >= ${muednoteDawLogs.ts}
          )`
        )
      )
      .orderBy(muednoteDawLogs.ts)
      .limit(limit);
  }

  // ========================================
  // Update Operations
  // ========================================

  /**
   * Link DAW logs to a session by ID
   * Used when explicitly associating logs with a session after the fact
   */
  async linkToSession(logIds: string[], sessionId: string): Promise<number> {
    if (logIds.length === 0) return 0;

    const result = await db
      .update(muednoteDawLogs)
      .set({ sessionId })
      .where(inArray(muednoteDawLogs.id, logIds))
      .returning({ id: muednoteDawLogs.id });

    return result.length;
  }

  /**
   * Link DAW logs to a session by time range
   * Convenience method for batch linking
   */
  async linkByTimeRange(
    userId: string,
    since: Date,
    until: Date,
    sessionId: string
  ): Promise<number> {
    const result = await db
      .update(muednoteDawLogs)
      .set({ sessionId })
      .where(
        and(
          eq(muednoteDawLogs.userId, userId),
          gte(muednoteDawLogs.ts, since),
          lte(muednoteDawLogs.ts, until)
        )
      )
      .returning({ id: muednoteDawLogs.id });

    return result.length;
  }

  // ========================================
  // Delete Operations
  // ========================================

  /**
   * Delete DAW logs by ID
   */
  async deleteById(logId: string): Promise<boolean> {
    const [deleted] = await db
      .delete(muednoteDawLogs)
      .where(eq(muednoteDawLogs.id, logId))
      .returning();

    return !!deleted;
  }

  /**
   * Delete DAW logs for a user in a time range
   * Useful for cleanup or GDPR compliance
   */
  async deleteByTimeRange(userId: string, since: Date, until: Date): Promise<number> {
    const result = await db
      .delete(muednoteDawLogs)
      .where(
        and(
          eq(muednoteDawLogs.userId, userId),
          gte(muednoteDawLogs.ts, since),
          lte(muednoteDawLogs.ts, until)
        )
      )
      .returning({ id: muednoteDawLogs.id });

    return result.length;
  }

  // ========================================
  // Statistics
  // ========================================

  /**
   * Get statistics for DAW logs in a time range
   */
  async getStats(userId: string, since: Date, until: Date): Promise<DawLogStats> {
    const logs = await this.getByTimeRange(userId, since, until, 10000);

    const byAction: Record<DawAction, number> = {
      parameter_change: 0,
      track_volume: 0,
      track_pan: 0,
      track_select: 0,
      clip_trigger: 0,
      device_config_change: 0,
    };

    const byDaw: Record<DawType, number> = {
      ableton: 0,
      protools: 0,
      logic: 0,
      other: 0,
    };

    for (const log of logs) {
      if (log.action) byAction[log.action]++;
      if (log.daw) byDaw[log.daw]++;
    }

    return {
      totalLogs: logs.length,
      byAction,
      byDaw,
    };
  }
}

// ========================================
// Singleton Instance
// ========================================

/**
 * Singleton repository instance
 * Use this for all DAW log database operations
 */
export const dawLogsRepository = new DawLogsRepository();
