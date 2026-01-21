/**
 * Question Templates Schema
 * Phase 1.3: Interview Question Template System
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  varchar,
  index,
} from 'drizzle-orm/pg-core';
import { interviewFocusEnum, interviewDepthEnum } from './sessions';

// ========================================
// Type Definitions
// ========================================

/**
 * Variable placeholder definition for template substitution
 */
export type VariablePlaceholder = {
  key: string;          // Placeholder key (e.g., "chord")
  description: string;  // Human-readable description
  type: 'string' | 'number' | 'boolean';
  required: boolean;
};

/**
 * Variables JSONB structure
 */
export type TemplateVariables = {
  placeholders?: VariablePlaceholder[];
};

// ========================================
// Main Tables
// ========================================

/**
 * Question Templates Table
 * Stores reusable question templates for InterviewerService
 */
export const questionTemplates = pgTable('question_templates', {
  // Primary key
  id: uuid('id').primaryKey().defaultRandom(),

  // Classification
  focus: interviewFocusEnum('focus').notNull(),
  depth: interviewDepthEnum('depth').notNull(),

  // Content
  templateText: text('template_text').notNull(),
  variables: jsonb('variables').$type<TemplateVariables>().default({}),

  // Metadata
  category: text('category'), // 'technical' | 'creative' | 'reflective' | 'diagnostic'
  language: varchar('language', { length: 10 }).default('ja').notNull(),
  tags: text('tags').array().default([]),

  // Priority & analytics
  priority: integer('priority').default(50).notNull(), // 0-100
  usageCount: integer('usage_count').default(0).notNull(),
  lastUsedAt: timestamp('last_used_at'),

  // Status
  enabled: boolean('enabled').default(true).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Primary lookup
  focusDepthIdx: index('idx_question_templates_focus_depth').on(
    table.focus,
    table.depth,
    table.priority
  ),
  // Priority-based selection
  priorityIdx: index('idx_question_templates_priority').on(
    table.priority,
    table.createdAt
  ),
  // Category filtering
  categoryIdx: index('idx_question_templates_category').on(
    table.category,
    table.focus
  ),
  // Analytics queries
  analyticsIdx: index('idx_question_templates_analytics').on(
    table.usageCount,
    table.lastUsedAt
  ),
}));

/**
 * RAG Embeddings Table
 * Stores vector embeddings for question templates and sessions
 */
export const ragEmbeddings = pgTable('rag_embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Source reference
  sourceType: text('source_type').notNull(), // 'template' | 'session' | 'log_entry'
  sourceId: uuid('source_id').notNull(),

  // Vector embedding (stored as text/jsonb since pgvector not available in Drizzle)
  embedding: text('embedding'), // Vector data as JSON string
  embeddingModel: text('embedding_model'), // e.g., 'text-embedding-ada-002'
  embeddingHash: text('embedding_hash'), // Hash for deduplication
  tokenCount: integer('token_count'), // Token count of source text

  // Metadata
  metadata: jsonb('metadata'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  sourceIdx: index('idx_rag_embeddings_source').on(table.sourceType, table.sourceId),
  embeddingHashIdx: index('idx_rag_embeddings_hash').on(table.embeddingHash),
}));

// ========================================
// Type Exports
// ========================================

export type QuestionTemplate = typeof questionTemplates.$inferSelect;
export type NewQuestionTemplate = typeof questionTemplates.$inferInsert;

export type RagEmbedding = typeof ragEmbeddings.$inferSelect;
export type NewRagEmbedding = typeof ragEmbeddings.$inferInsert;

// ========================================
// Helper Types
// ========================================

export type QuestionTemplateCategory = 'technical' | 'creative' | 'reflective' | 'diagnostic';

/**
 * Question template filter options
 */
export interface QuestionTemplateFilter {
  focus?: string;
  depth?: string;
  category?: QuestionTemplateCategory;
  enabled?: boolean;
  minPriority?: number;
}
