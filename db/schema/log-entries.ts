/**
 * Log Entries Schema - MUEDnote Core
 * Phase 1: 制作・学習ログシステム
 *
 * このスキーマは、MUED内のあらゆる学習活動を「資産」として記録し、
 * 学習者の成長を追跡可能にします。
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  pgEnum,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from '../schema';

// ========================================
// Enum Definitions
// ========================================

// ログタイプの定義
export const logTypeEnum = pgEnum('log_type', [
  'lesson',           // レッスン関連
  'practice',         // 練習記録
  'creation',         // 制作活動
  'reflection',       // 振り返り・考察
  'system',          // システム自動生成
  'ear_training',    // 耳トレーニング
  'structure_analysis' // 構造分析
]);

// ターゲットタイプの定義（ポリモーフィック参照用）
export const targetTypeEnum = pgEnum('target_type', [
  'lesson',
  'material',
  'ear_exercise',
  'form_exercise',
  'reservation',
  'user_creation'
]);

// ========================================
// Type Definitions
// ========================================

// AI要約の型定義
export type AISummary = {
  keyPoints: string[];        // 重要ポイント
  improvements: string[];      // 改善提案
  keywords: string[];         // キーワード
  emotionalTone?: string;     // 感情的トーン分析
  technicalInsights?: string[]; // 技術的洞察
};

// 添付ファイルの型定義
export type Attachment = {
  type: 'image' | 'audio' | 'video' | 'document' | 'other';
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
};

// ========================================
// Main Tables
// ========================================

/**
 * ログエントリテーブル - MUEDnoteの中核
 * すべての学習・制作活動を記録
 */
export const logEntries = pgTable('log_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),  // 外部キー制約はマイグレーションで追加

  // ログ分類
  type: logTypeEnum('type').notNull(),

  // ポリモーフィック参照（どの対象に関するログか）
  targetId: uuid('target_id'),
  targetType: targetTypeEnum('target_type'),

  // コンテンツ
  content: text('content').notNull(),  // Markdown形式
  aiSummary: jsonb('ai_summary').$type<AISummary>(),

  // メタデータ
  tags: jsonb('tags').$type<string[]>(),
  difficulty: text('difficulty'),      // 体感難易度: easy, medium, hard, very_hard
  emotion: text('emotion'),            // 学習時の感情: frustrated, confused, excited, confident, etc.
  attachments: jsonb('attachments').$type<Attachment[]>(),

  // プライバシー設定
  isPublic: boolean('is_public').default(false).notNull(),
  shareWithMentor: boolean('share_with_mentor').default(true).notNull(),

  // タイムスタンプ
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // インデックス設計
  userIdx: index('idx_log_entries_user').on(table.userId),
  typeIdx: index('idx_log_entries_type').on(table.type),
  targetIdx: index('idx_log_entries_target').on(table.targetId, table.targetType),
  createdAtIdx: index('idx_log_entries_created_at').on(table.createdAt),
  userCreatedIdx: index('idx_log_entries_user_created').on(table.userId, table.createdAt),
  publicIdx: index('idx_log_entries_public').on(table.isPublic),
}));

// ========================================
// Relations
// ========================================

export const logEntriesRelations = relations(logEntries, ({ one }) => ({
  user: one(users, {
    fields: [logEntries.userId],
    references: [users.id],
  }),
}));

// ========================================
// Type Exports
// ========================================

export type LogEntry = typeof logEntries.$inferSelect;
export type NewLogEntry = typeof logEntries.$inferInsert;

// ========================================
// Helper Types
// ========================================

export type LogType = typeof logTypeEnum.enumValues[number];
export type TargetType = typeof targetTypeEnum.enumValues[number];

// ログエントリ作成時の入力型
export interface CreateLogEntryInput {
  userId: string;
  type: LogType;
  targetId?: string;
  targetType?: TargetType;
  content: string;
  tags?: string[];
  difficulty?: string;
  emotion?: string;
  attachments?: Attachment[];
  isPublic?: boolean;
  shareWithMentor?: boolean;
}

// ログエントリフィルタ条件
export interface LogEntryFilter {
  userId?: string;
  type?: LogType;
  targetId?: string;
  targetType?: TargetType;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  isPublic?: boolean;
}

// ページネーション情報
export interface PaginationParams {
  page: number;
  pageSize: number;
  orderBy?: 'createdAt' | 'updatedAt';
  orderDirection?: 'asc' | 'desc';
}