/**
 * RAG Metrics and Data Provenance Schema
 * Phase 2: RAG観測とデータ管理
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  numeric,
  boolean,
  varchar,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

// Enum definitions
export const contentTypeEnum = pgEnum('content_type', [
  'material',
  'creation_log',
  'generated',
  'note_article',
  'ai_response'
]);

export const acquisitionMethodEnum = pgEnum('acquisition_method', [
  'api_fetch',
  'manual_upload',
  'ai_generated',
  'user_created',
  'system_import'
]);

export const licenseTypeEnum = pgEnum('license_type', [
  'cc_by',
  'cc_by_sa',
  'cc_by_nc',
  'cc_by_nc_sa',
  'proprietary',
  'mit',
  'apache_2_0',
  'all_rights_reserved',
  'public_domain'
]);

// Citation confidence and source types
export type Citation = {
  source: string;
  sourceType: 'note' | 'material' | 'document' | 'web';
  excerpt: string;
  confidence: number; // 0.0 to 1.0
  timestamp: string;
  pageNumber?: number;
  paragraphIndex?: number;
};

// Access policy for provenance
export type AccessPolicy = {
  readGroups: string[];
  writeGroups: string[];
  expiresAt?: string;
  geoRestrictions?: string[];
  ipWhitelist?: string[];
};

// Extended AI Dialogue Log table
export const aiDialogueLog = pgTable('ai_dialogue_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  sessionId: uuid('session_id').notNull(),

  // Original fields
  query: text('query').notNull(),
  response: text('response').notNull(),
  modelUsed: varchar('model_used', { length: 100 }).notNull(),

  // New RAG metrics fields
  citations: jsonb('citations').$type<Citation[]>(),
  latencyMs: integer('latency_ms'),
  tokenCostJpy: numeric('token_cost_jpy', { precision: 8, scale: 2 }),
  citationRate: numeric('citation_rate', { precision: 5, scale: 2 }),

  // Token usage tracking
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  totalTokens: integer('total_tokens'),

  // Quality metrics
  relevanceScore: numeric('relevance_score', { precision: 3, scale: 2 }), // 0.00 to 1.00
  userFeedback: integer('user_feedback'), // -1: negative, 0: neutral, 1: positive

  // Metadata
  contextWindowSize: integer('context_window_size'),
  temperature: numeric('temperature', { precision: 3, scale: 2 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userIdx: index('idx_ai_dialogue_user').on(table.userId),
  sessionIdx: index('idx_ai_dialogue_session').on(table.sessionId),
  createdAtIdx: index('idx_ai_dialogue_created_at').on(table.createdAt),
  citationRateIdx: index('idx_ai_dialogue_citation_rate').on(table.citationRate)
}));

// Provenance tracking table
export const provenance = pgTable('provenance', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentId: uuid('content_id').notNull(),
  contentType: contentTypeEnum('content_type').notNull(),

  // Source management
  sourceUri: text('source_uri'),
  licenseType: licenseTypeEnum('license_type'),
  acquisitionMethod: acquisitionMethodEnum('acquisition_method'),
  rightsHolder: text('rights_holder'),
  permissionFlag: boolean('permission_flag').default(false),

  // Digital signature (future C2PA support)
  hashC2pa: text('hash_c2pa'),
  hashSha256: text('hash_sha256'),

  // Metadata
  retentionYears: integer('retention_years'),
  accessPolicy: jsonb('access_policy').$type<AccessPolicy>(),
  externalShareConsent: boolean('external_share_consent').default(false),

  // Audit trail
  acquiredBy: uuid('acquired_by'),
  acquiredAt: timestamp('acquired_at'),
  lastVerifiedAt: timestamp('last_verified_at'),
  verificationStatus: varchar('verification_status', { length: 50 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  contentIdx: index('idx_provenance_content').on(table.contentId, table.contentType),
  sourceIdx: index('idx_provenance_source').on(table.sourceUri),
  licenseIdx: index('idx_provenance_license').on(table.licenseType),
  retentionIdx: index('idx_provenance_retention').on(table.retentionYears)
}));

// RAG Metrics History table for batch aggregation
export const ragMetricsHistory = pgTable('rag_metrics_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: timestamp('date').notNull(),

  // Citation metrics
  citationRate: numeric('citation_rate', { precision: 5, scale: 2 }),
  citationCount: integer('citation_count'),
  uniqueSourcesCount: integer('unique_sources_count'),

  // Latency metrics
  latencyP50Ms: integer('latency_p50_ms'),
  latencyP95Ms: integer('latency_p95_ms'),
  latencyP99Ms: integer('latency_p99_ms'),

  // Cost metrics
  costPerAnswer: numeric('cost_per_answer', { precision: 6, scale: 2 }),
  totalCost: numeric('total_cost', { precision: 10, scale: 2 }),

  // Volume metrics
  totalQueries: integer('total_queries'),
  uniqueUsers: integer('unique_users'),
  averageTokensPerQuery: integer('average_tokens_per_query'),

  // Quality metrics
  averageRelevanceScore: numeric('average_relevance_score', { precision: 3, scale: 2 }),
  positiveVotesRate: numeric('positive_votes_rate', { precision: 5, scale: 2 }),

  // SLO compliance
  sloCompliance: jsonb('slo_compliance').$type<{
    citationRateMet: boolean;
    latencyMet: boolean;
    costMet: boolean;
    overallMet: boolean;
  }>(),

  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  dateIdx: index('idx_rag_metrics_date').on(table.date),
  complianceIdx: index('idx_rag_metrics_compliance').on(table.sloCompliance)
}));

// Plugin Registry table for extensibility
export const pluginRegistry = pgTable('plugin_registry', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  source: varchar('source', { length: 50 }).notNull().unique(),

  // Capabilities
  capabilities: jsonb('capabilities').$type<{
    list: boolean;
    search: boolean;
    filter: boolean;
    fetch: boolean;
    transform: boolean;
  }>().notNull(),

  // Configuration
  config: jsonb('config'),
  apiEndpoint: text('api_endpoint'),
  apiKeyEnvVar: varchar('api_key_env_var', { length: 100 }),

  // Status
  enabled: boolean('enabled').default(true),
  version: varchar('version', { length: 20 }).notNull(),
  lastHealthCheck: timestamp('last_health_check'),
  healthStatus: varchar('health_status', { length: 50 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  nameIdx: index('idx_plugin_name').on(table.name),
  enabledIdx: index('idx_plugin_enabled').on(table.enabled)
}));

// Type exports for use in application code
export type AiDialogueLog = typeof aiDialogueLog.$inferSelect;
export type NewAiDialogueLog = typeof aiDialogueLog.$inferInsert;

export type Provenance = typeof provenance.$inferSelect;
export type NewProvenance = typeof provenance.$inferInsert;

export type RagMetricsHistory = typeof ragMetricsHistory.$inferSelect;
export type NewRagMetricsHistory = typeof ragMetricsHistory.$inferInsert;

export type PluginRegistry = typeof pluginRegistry.$inferSelect;
export type NewPluginRegistry = typeof pluginRegistry.$inferInsert;