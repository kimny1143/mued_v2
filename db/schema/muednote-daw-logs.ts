/**
 * MUEDnote DAW Logs Schema
 *
 * DAW（Ableton Live等）からのパラメータ変更ログ
 * 時間ベースでセッションと紐付け
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  real,
  integer,
  index,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';

// ========================================
// Enum Definitions
// ========================================

/**
 * DAW種別
 */
export const dawTypeEnum = pgEnum('muednote_daw_type', [
  'ableton',    // Ableton Live
  'protools',   // Pro Tools（将来）
  'logic',      // Logic Pro（将来）
  'other',
]);

/**
 * アクション種別
 */
export const dawActionEnum = pgEnum('muednote_daw_action', [
  'parameter_change',  // デバイスパラメータ変更
  'track_volume',      // トラックボリューム変更
  'track_pan',         // トラックパン変更
  'track_select',      // トラック選択（将来）
  'clip_trigger',      // クリップトリガー（将来）
]);

// ========================================
// Tables
// ========================================

/**
 * DAWログ - パラメータ変更等の操作ログ
 *
 * session_id は NULL で保存し、ReviewScreen表示時に時間マッチングで取得
 */
export const muednoteDawLogs = pgTable(
  'muednote_daw_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),           // Clerk user_id
    sessionId: uuid('session_id'),               // NULL可: 時間マッチング用
    ts: timestamp('ts', { withTimezone: true }).notNull(), // イベント発生時刻
    daw: dawTypeEnum('daw').notNull().default('ableton'),
    action: dawActionEnum('action').notNull().default('parameter_change'),

    // パラメータ情報
    trackId: integer('track_id').notNull(),
    deviceId: integer('device_id').notNull(),    // -1 = トラックレベル（Volume/Pan）
    paramId: integer('param_id').notNull(),
    value: real('value').notNull(),
    valueString: text('value_string').notNull(), // 人間可読値（"120 Hz", "-3.5 dB"等）

    // メタデータ（将来拡張用）
    metadata: jsonb('metadata'),                 // トラック名、デバイス名等

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    // ユーザー + 時間でのクエリ用（時間マッチング）
    index('idx_muednote_daw_logs_user_ts').on(table.userId, table.ts),
    // セッションIDでのクエリ用
    index('idx_muednote_daw_logs_session').on(table.sessionId, table.ts),
  ]
);

// ========================================
// Types
// ========================================

export type DawLog = typeof muednoteDawLogs.$inferSelect;
export type NewDawLog = typeof muednoteDawLogs.$inferInsert;
export type DawType = 'ableton' | 'protools' | 'logic' | 'other';
export type DawAction = 'parameter_change' | 'track_volume' | 'track_pan' | 'track_select' | 'clip_trigger';
