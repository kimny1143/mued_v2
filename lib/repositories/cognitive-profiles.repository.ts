/**
 * CognitiveProfileRepository - Data access layer for MUEDlobe
 */

import { db } from '@/db/edge';
import {
  cognitiveProfiles,
  measurementHistory,
  hooConfigurations,
} from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { NewCognitiveProfile, NewMeasurementHistoryRecord } from '@/db/schema/cognitive-profiles';

// ========================================
// CognitiveProfileRepository Class
// ========================================

export class CognitiveProfileRepository {
  // ========================================
  // Cognitive Profiles
  // ========================================

  async findByUserId(userId: string) {
    const [profile] = await db
      .select()
      .from(cognitiveProfiles)
      .where(eq(cognitiveProfiles.userId, userId))
      .limit(1);

    return profile ?? null;
  }

  async upsert(userId: string, data: Omit<NewCognitiveProfile, 'id' | 'userId'>) {
    const existing = await this.findByUserId(userId);

    if (existing) {
      const [updated] = await db
        .update(cognitiveProfiles)
        .set({
          ...data,
          measuredAt: new Date(),
          version: (existing.version ?? 0) + 1,
        })
        .where(eq(cognitiveProfiles.userId, userId))
        .returning();

      return updated;
    }

    const [created] = await db
      .insert(cognitiveProfiles)
      .values({ userId, ...data })
      .returning();

    return created;
  }

  async delete(userId: string) {
    const [deleted] = await db
      .delete(cognitiveProfiles)
      .where(eq(cognitiveProfiles.userId, userId))
      .returning();

    return deleted ?? null;
  }

  // ========================================
  // Measurement History
  // ========================================

  async addMeasurement(data: NewMeasurementHistoryRecord) {
    const [record] = await db
      .insert(measurementHistory)
      .values(data)
      .returning();

    return record;
  }

  async findMeasurementsByUserId(userId: string) {
    return await db
      .select()
      .from(measurementHistory)
      .where(eq(measurementHistory.userId, userId));
  }

  async findDistinctGameTypesByUserId(userId: string): Promise<string[]> {
    const rows = await db
      .selectDistinct({ gameType: measurementHistory.gameType })
      .from(measurementHistory)
      .where(eq(measurementHistory.userId, userId));

    return rows.map((r) => r.gameType);
  }

  // ========================================
  // Hoo Configurations
  // ========================================

  async findHooConfig(userId: string) {
    const [config] = await db
      .select()
      .from(hooConfigurations)
      .where(eq(hooConfigurations.userId, userId))
      .limit(1);

    return config ?? null;
  }

  async upsertHooConfig(userId: string, data: {
    presetName?: string;
    customPrompt?: string;
    variables?: Record<string, unknown>;
    snippets?: string[];
    specialInstructions?: string[];
  }) {
    const existing = await this.findHooConfig(userId);

    if (existing) {
      const [updated] = await db
        .update(hooConfigurations)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(hooConfigurations.userId, userId))
        .returning();

      return updated;
    }

    const [created] = await db
      .insert(hooConfigurations)
      .values({ userId, ...data })
      .returning();

    return created;
  }
}

// ========================================
// Singleton Instance
// ========================================

export const cognitiveProfileRepository = new CognitiveProfileRepository();
