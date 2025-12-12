/**
 * Chat System Schema - MUEDnote v2.0
 *
 * チャット型インターフェースとAI人格システムのためのスキーマ定義
 * 既存のlog-entries.tsからの移行を考慮した設計
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  boolean,
  integer,
  decimal,
  pgEnum,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from '../schema';

// ========================================
// Enum Definitions
// ========================================

// チャットロールの定義
export const chatRoleEnum = pgEnum('chat_role', [
  'user',
  'assistant',
  'system'
]);

// AI人格プリセット
export const personalityPresetEnum = pgEnum('personality_preset', [
  'friendly_mentor',      // フレンドリーな指導者
  'professional_coach',   // プロフェッショナルコーチ
  'peer_learner',        // 仲間の学習者
  'strict_teacher',      // 厳格な教師
  'creative_partner'     // 創造的パートナー
]);

// レスポンスの長さ設定
export const responseLengthEnum = pgEnum('response_length', [
  'concise',
  'standard',
  'detailed'
]);

// メモリタイプ
export const memoryTypeEnum = pgEnum('memory_type', [
  'preference',   // 好み・嗜好
  'pattern',      // 行動パターン
  'feedback',     // フィードバック履歴
  'knowledge'     // 知識レベル
]);

// ========================================
// Type Definitions
// ========================================

// セッションサマリーの型
export type SessionSummary = {
  mainTopics: string[];
  keyInsights: string[];
  actionItems: string[];
  emotionalTone: string;
  progressIndicators: string[];
};

// メッセージメタデータの型
export type MessageMetadata = {
  processingTime?: number;
  tokenCount?: number;
  modelUsed?: string;
  confidence?: number;
  suggestedActions?: string[];
  relatedConcepts?: string[];
};

// カスタム設定の型
export type CustomPreferences = {
  avoidTopics?: string[];      // 避けるトピック
  focusAreas?: string[];       // 重点領域
  preferredExamples?: string[]; // 好みの例示スタイル
  languageComplexity?: 'simple' | 'moderate' | 'advanced';
  musicalBackground?: string;
};

// メモリ値の型
export type MemoryValue = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any; // Flexible content storage for memory values
  source: 'explicit' | 'inferred' | 'observed';
  examples?: string[];
  relatedMemories?: string[];
};

// ========================================
// Main Tables
// ========================================

/**
 * チャットセッションテーブル
 * ユーザーとの会話セッションを管理
 */
export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),

  // セッション情報
  title: text('title'),                          // AI生成またはユーザー設定のタイトル
  summary: jsonb('summary').$type<SessionSummary>(), // セッション要約
  isActive: boolean('is_active').default(true).notNull(),
  isPinned: boolean('is_pinned').default(false).notNull(),

  // 統計情報
  messageCount: integer('message_count').default(0).notNull(),
  lastMessageAt: timestamp('last_message_at'),

  // タイムスタンプ
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  archivedAt: timestamp('archived_at'),
}, (table) => ({
  // インデックス
  userIdx: index('idx_chat_sessions_user').on(table.userId),
  activeIdx: index('idx_chat_sessions_active').on(table.isActive),
  pinnedIdx: index('idx_chat_sessions_pinned').on(table.isPinned),
  lastMessageIdx: index('idx_chat_sessions_last_message').on(table.lastMessageAt),
  userActiveIdx: index('idx_chat_sessions_user_active').on(table.userId, table.isActive),
}));

/**
 * チャットメッセージテーブル
 * 個々のメッセージを保存
 */
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull(),
  userId: uuid('user_id').notNull(),

  // メッセージ内容
  role: chatRoleEnum('role').notNull(),
  content: text('content').notNull(),
  processedContent: text('processed_content'),   // AI整形後の内容

  // メタデータ
  tags: jsonb('tags').$type<string[]>().default([]),
  metadata: jsonb('metadata').$type<MessageMetadata>(),

  // 関連情報
  parentMessageId: uuid('parent_message_id'),     // 返信元メッセージ
  isEdited: boolean('is_edited').default(false).notNull(),
  editedAt: timestamp('edited_at'),

  // タイムスタンプ
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // インデックス
  sessionIdx: index('idx_chat_messages_session').on(table.sessionId),
  userIdx: index('idx_chat_messages_user').on(table.userId),
  createdIdx: index('idx_chat_messages_created').on(table.createdAt),
  sessionCreatedIdx: index('idx_chat_messages_session_created').on(
    table.sessionId,
    table.createdAt
  ),
  tagsGinIdx: index('idx_chat_messages_tags_gin').using('gin', table.tags),
}));

/**
 * ユーザーAIプロファイルテーブル
 * ユーザーごとのAI人格設定
 */
export const userAIProfiles = pgTable('user_ai_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),

  // 基本設定
  personalityPreset: personalityPresetEnum('personality_preset')
    .default('friendly_mentor')
    .notNull(),
  responseLength: responseLengthEnum('response_length')
    .default('standard')
    .notNull(),
  formalityLevel: integer('formality_level')
    .default(3)
    .notNull(), // 1-5: カジュアル〜フォーマル

  // インタラクション設定
  questionFrequency: integer('question_frequency')
    .default(3)
    .notNull(), // 1-5: 質問の頻度
  suggestionFrequency: integer('suggestion_frequency')
    .default(3)
    .notNull(), // 1-5: 提案の頻度
  encouragementLevel: integer('encouragement_level')
    .default(3)
    .notNull(), // 1-5: 励ましの強さ

  // カスタム設定
  customPreferences: jsonb('custom_preferences').$type<CustomPreferences>(),

  // 利用統計
  totalInteractions: integer('total_interactions').default(0).notNull(),
  lastInteractionAt: timestamp('last_interaction_at'),

  // タイムスタンプ
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // インデックス
  userUniqueIdx: uniqueIndex('idx_user_ai_profiles_user_unique').on(table.userId),
}));

/**
 * ユーザーAIメモリテーブル
 * ユーザーとの対話から学習した情報を保存
 */
export const userAIMemories = pgTable('user_ai_memories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),

  // メモリ情報
  memoryType: memoryTypeEnum('memory_type').notNull(),
  key: text('key').notNull(),                    // メモリのキー（例: "preferred_tempo"）
  value: jsonb('value').$type<MemoryValue>().notNull(),

  // 信頼度と頻度
  confidence: decimal('confidence', { precision: 3, scale: 2 })
    .default('0.50')
    .notNull(), // 0.00-1.00
  frequency: integer('frequency').default(1).notNull(),

  // メモリ管理
  lastAccessed: timestamp('last_accessed'),
  expiresAt: timestamp('expires_at'),           // 自動削除用
  isActive: boolean('is_active').default(true).notNull(),

  // ソース情報
  sourceSessionId: uuid('source_session_id'),    // どのセッションで学習したか
  sourceMessageId: uuid('source_message_id'),    // どのメッセージから学習したか

  // タイムスタンプ
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // インデックス
  userTypeIdx: index('idx_user_ai_memories_user_type').on(
    table.userId,
    table.memoryType
  ),
  confidenceIdx: index('idx_user_ai_memories_confidence').on(table.confidence),
  activeIdx: index('idx_user_ai_memories_active').on(table.isActive),
  expiresIdx: index('idx_user_ai_memories_expires').on(table.expiresAt),
  userKeyIdx: uniqueIndex('idx_user_ai_memories_user_key').on(
    table.userId,
    table.memoryType,
    table.key
  ),
}));

/**
 * セッションタグテーブル
 * セッション全体に対するタグ管理（正規化）
 */
export const sessionTags = pgTable('session_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull(),
  tag: text('tag').notNull(),
  frequency: integer('frequency').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  sessionTagIdx: uniqueIndex('idx_session_tags_unique').on(
    table.sessionId,
    table.tag
  ),
  tagIdx: index('idx_session_tags_tag').on(table.tag),
}));

// ========================================
// Relations
// ========================================

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
  messages: many(chatMessages),
  tags: many(sessionTags),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
  parentMessage: one(chatMessages, {
    fields: [chatMessages.parentMessageId],
    references: [chatMessages.id],
  }),
}));

export const userAIProfilesRelations = relations(userAIProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userAIProfiles.userId],
    references: [users.id],
  }),
}));

export const userAIMemoriesRelations = relations(userAIMemories, ({ one }) => ({
  user: one(users, {
    fields: [userAIMemories.userId],
    references: [users.id],
  }),
  sourceSession: one(chatSessions, {
    fields: [userAIMemories.sourceSessionId],
    references: [chatSessions.id],
  }),
  sourceMessage: one(chatMessages, {
    fields: [userAIMemories.sourceMessageId],
    references: [chatMessages.id],
  }),
}));

export const sessionTagsRelations = relations(sessionTags, ({ one }) => ({
  session: one(chatSessions, {
    fields: [sessionTags.sessionId],
    references: [chatSessions.id],
  }),
}));

// ========================================
// Type Exports
// ========================================

export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

export type UserAIProfile = typeof userAIProfiles.$inferSelect;
export type NewUserAIProfile = typeof userAIProfiles.$inferInsert;

export type UserAIMemory = typeof userAIMemories.$inferSelect;
export type NewUserAIMemory = typeof userAIMemories.$inferInsert;

export type SessionTag = typeof sessionTags.$inferSelect;
export type NewSessionTag = typeof sessionTags.$inferInsert;

// ========================================
// Helper Types & Interfaces
// ========================================

export type ChatRole = typeof chatRoleEnum.enumValues[number];
export type PersonalityPreset = typeof personalityPresetEnum.enumValues[number];
export type ResponseLength = typeof responseLengthEnum.enumValues[number];
export type MemoryType = typeof memoryTypeEnum.enumValues[number];

// チャットメッセージ作成時の入力型
export interface CreateChatMessageInput {
  sessionId: string;
  userId: string;
  role: ChatRole;
  content: string;
  tags?: string[];
  metadata?: MessageMetadata;
  parentMessageId?: string;
}

// セッション作成時の入力型
export interface CreateChatSessionInput {
  userId: string;
  title?: string;
  initialMessage?: string;
}

// AIプロファイル更新時の入力型
export interface UpdateAIProfileInput {
  personalityPreset?: PersonalityPreset;
  responseLength?: ResponseLength;
  formalityLevel?: number;
  questionFrequency?: number;
  suggestionFrequency?: number;
  encouragementLevel?: number;
  customPreferences?: CustomPreferences;
}

// メモリ記録時の入力型
export interface RecordMemoryInput {
  userId: string;
  memoryType: MemoryType;
  key: string;
  value: MemoryValue;
  confidence?: number;
  sourceSessionId?: string;
  sourceMessageId?: string;
}

// セッションフィルタ条件
export interface SessionFilterParams {
  userId: string;
  isActive?: boolean;
  isPinned?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  searchQuery?: string;
}

// ページネーション (Chat system specific - renamed to avoid conflict with log-entries)
export interface ChatPaginationParams {
  page: number;
  pageSize: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'lastMessageAt';
  orderDirection?: 'asc' | 'desc';
}