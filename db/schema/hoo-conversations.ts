/**
 * Hoo Conversations Schema - MUEDnote
 * AI conversation history for thought organization assistant
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  integer,
  decimal,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from '../schema';

// ========================================
// Type Definitions
// ========================================

export interface HooMessageData {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface HooConversationMetrics {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
}

// ========================================
// Hoo Conversations Table
// ========================================

/**
 * Stores Hoo AI conversation sessions
 * Each conversation is a complete session (multiple messages)
 */
export const hooConversations = pgTable('hoo_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),

  // Conversation content
  title: text('title'), // Auto-generated or user-provided
  messages: jsonb('messages').$type<HooMessageData[]>().notNull().default([]),
  messageCount: integer('message_count').notNull().default(0),

  // AI model used
  model: text('model').notNull().default('claude-haiku-4-5-20251001'),
  provider: text('provider').notNull().default('claude'), // claude, gemini, openai

  // Usage metrics (aggregated for the session)
  totalInputTokens: integer('total_input_tokens').notNull().default(0),
  totalOutputTokens: integer('total_output_tokens').notNull().default(0),
  totalCostUsd: decimal('total_cost_usd', { precision: 10, scale: 6 }).notNull().default('0'),

  // Session metadata
  startedAt: timestamp('started_at').notNull().defaultNow(),
  lastMessageAt: timestamp('last_message_at').notNull().defaultNow(),

  // Optional: extracted insights/summary (for future use)
  summary: text('summary'),
  tags: jsonb('tags').$type<string[]>(),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_hoo_conversations_user_id').on(table.userId),
  startedAtIdx: index('idx_hoo_conversations_started_at').on(table.startedAt),
  lastMessageAtIdx: index('idx_hoo_conversations_last_message_at').on(table.lastMessageAt),
  userStartedIdx: index('idx_hoo_conversations_user_started').on(table.userId, table.startedAt),
}));

// ========================================
// Relations
// ========================================

export const hooConversationsRelations = relations(hooConversations, ({ one }) => ({
  user: one(users, {
    fields: [hooConversations.userId],
    references: [users.id],
  }),
}));
