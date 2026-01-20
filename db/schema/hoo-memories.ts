/**
 * Hoo Memories Schema - MUEDnote
 * User memory storage for personalized Hoo AI conversations
 *
 * Phase 1: Custom Instructions (user-provided context)
 * Phase 2: Auto Memories (AI-extracted memories from conversations) - future
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from '../schema';

// ========================================
// Type Definitions
// ========================================

/**
 * Auto-extracted memory from conversations (Phase 2)
 */
export interface HooAutoMemory {
  id: string;
  content: string;
  category: 'equipment' | 'genre' | 'skill' | 'project' | 'preference';
  source: {
    conversationId: string;
    extractedAt: string;
  };
  confidence: number; // 0.0 - 1.0
  createdAt: string;
}

/**
 * Memory settings returned from repository
 */
export interface HooMemorySettings {
  id: string;
  userId: string;
  customInstructions: string | null;
  customInstructionsEnabled: boolean;
  autoMemories: HooAutoMemory[];
  autoMemoryEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// Hoo Memories Table
// ========================================

/**
 * Stores user memory settings for Hoo AI
 * One record per user (upsert pattern)
 */
export const hooMemories = pgTable('hoo_memories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),

  // Phase 1: Custom Instructions (user-provided context)
  customInstructions: text('custom_instructions'),
  customInstructionsEnabled: boolean('custom_instructions_enabled').notNull().default(true),

  // Phase 2: Auto Memories (AI-extracted, future implementation)
  autoMemories: jsonb('auto_memories').$type<HooAutoMemory[]>().notNull().default([]),
  autoMemoryEnabled: boolean('auto_memory_enabled').notNull().default(true),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_hoo_memories_user_id').on(table.userId),
}));

// ========================================
// Relations
// ========================================

export const hooMemoriesRelations = relations(hooMemories, ({ one }) => ({
  user: one(users, {
    fields: [hooMemories.userId],
    references: [users.id],
  }),
}));
