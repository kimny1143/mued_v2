/**
 * MUEDnote Mobile v7 MVP Schema
 *
 * シンプルなセッション + ログテーブル
 * モバイルアプリからの思考ログ同期用
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  real,
  integer,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ========================================
// Enum Definitions
// ========================================

/**
 * セッションステータス
 */
export const mobileSessionStatusEnum = pgEnum('muednote_mobile_session_status', [
  'active',     // セッション進行中
  'completed',  // セッション終了
  'synced',     // サーバー同期済み
]);

// ========================================
// Tables
// ========================================

/**
 * モバイルセッション - タイマーベースの作業セッション
 */
export const muednoteMobileSessions = pgTable(
  'muednote_mobile_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),           // Clerk user_id
    durationSec: integer('duration_sec').notNull(), // 予定時間（秒）
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    deviceId: text('device_id'),                 // デバイス識別子（将来用）
    sessionMemo: text('session_memo'),           // セッション振り返りメモ
    status: mobileSessionStatusEnum('status').default('completed'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_muednote_mobile_sessions_user').on(table.userId),
    index('idx_muednote_mobile_sessions_user_created').on(table.userId, table.createdAt),
  ]
);

/**
 * モバイルログ - 文字起こしされた思考断片
 */
export const muednoteMobileLogs = pgTable(
  'muednote_mobile_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').notNull().references(() => muednoteMobileSessions.id, { onDelete: 'cascade' }),
    timestampSec: real('timestamp_sec').notNull(), // セッション開始からの秒数
    text: text('text').notNull(),                  // 文字起こしテキスト
    confidence: real('confidence'),                // Whisper信頼度 (0-1)
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_muednote_mobile_logs_session').on(table.sessionId),
    index('idx_muednote_mobile_logs_session_timestamp').on(table.sessionId, table.timestampSec),
  ]
);

// ========================================
// Relations
// ========================================

export const muednoteMobileSessionsRelations = relations(muednoteMobileSessions, ({ many }) => ({
  logs: many(muednoteMobileLogs),
}));

export const muednoteMobileLogsRelations = relations(muednoteMobileLogs, ({ one }) => ({
  session: one(muednoteMobileSessions, {
    fields: [muednoteMobileLogs.sessionId],
    references: [muednoteMobileSessions.id],
  }),
}));

// ========================================
// Types
// ========================================

export type MobileSession = typeof muednoteMobileSessions.$inferSelect;
export type NewMobileSession = typeof muednoteMobileSessions.$inferInsert;
export type MobileLog = typeof muednoteMobileLogs.$inferSelect;
export type NewMobileLog = typeof muednoteMobileLogs.$inferInsert;
export type MobileSessionStatus = 'active' | 'completed' | 'synced';
