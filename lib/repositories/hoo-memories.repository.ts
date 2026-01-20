/**
 * HooMemoriesRepository - Data access layer for Hoo memory settings
 *
 * Provides CRUD operations for user's custom instructions and memory settings.
 * Phase 1: Custom Instructions (user-provided context)
 * Phase 2: Auto Memories (AI-extracted, future implementation)
 */

import { db } from '@/db/edge';
import { hooMemories, type HooMemorySettings, type HooAutoMemory } from '@/db/schema';
import { eq } from 'drizzle-orm';

// ========================================
// Type Definitions
// ========================================

export interface UpdateCustomInstructionsInput {
  userId: string;
  customInstructions: string | null;
}

export interface ToggleCustomInstructionsInput {
  userId: string;
  enabled: boolean;
}

// Re-export types for convenience
export type { HooMemorySettings, HooAutoMemory };

// ========================================
// HooMemoriesRepository Class
// ========================================

export class HooMemoriesRepository {
  /**
   * Get memory settings for a user
   * Returns null if no settings exist yet
   */
  async getMemorySettings(userId: string): Promise<HooMemorySettings | null> {
    const [settings] = await db
      .select()
      .from(hooMemories)
      .where(eq(hooMemories.userId, userId))
      .limit(1);

    return settings ?? null;
  }

  /**
   * Get custom instructions for a user
   * Returns null if not set or disabled
   */
  async getCustomInstructions(userId: string): Promise<string | null> {
    const settings = await this.getMemorySettings(userId);

    if (!settings?.customInstructionsEnabled) {
      return null;
    }

    return settings.customInstructions ?? null;
  }

  /**
   * Update custom instructions for a user
   * Creates settings record if it doesn't exist (upsert)
   */
  async updateCustomInstructions(input: UpdateCustomInstructionsInput): Promise<HooMemorySettings> {
    const existing = await this.getMemorySettings(input.userId);

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(hooMemories)
        .set({
          customInstructions: input.customInstructions,
          updatedAt: new Date(),
        })
        .where(eq(hooMemories.userId, input.userId))
        .returning();

      return updated;
    }

    // Create new
    const [created] = await db
      .insert(hooMemories)
      .values({
        userId: input.userId,
        customInstructions: input.customInstructions,
      })
      .returning();

    return created;
  }

  /**
   * Toggle custom instructions enabled/disabled
   */
  async toggleCustomInstructions(input: ToggleCustomInstructionsInput): Promise<HooMemorySettings> {
    const existing = await this.getMemorySettings(input.userId);

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(hooMemories)
        .set({
          customInstructionsEnabled: input.enabled,
          updatedAt: new Date(),
        })
        .where(eq(hooMemories.userId, input.userId))
        .returning();

      return updated;
    }

    // Create new (with no instructions, just the enabled state)
    const [created] = await db
      .insert(hooMemories)
      .values({
        userId: input.userId,
        customInstructionsEnabled: input.enabled,
      })
      .returning();

    return created;
  }

  /**
   * Delete memory settings for a user
   */
  async delete(userId: string): Promise<HooMemorySettings | null> {
    const [deleted] = await db
      .delete(hooMemories)
      .where(eq(hooMemories.userId, userId))
      .returning();

    return deleted ?? null;
  }
}

// ========================================
// Singleton Instance
// ========================================

export const hooMemoriesRepository = new HooMemoriesRepository();
