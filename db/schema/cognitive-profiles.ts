/**
 * MUEDlobe - Cognitive Profiles Schema
 *
 * 認知プロファイリング機能のデータベーススキーマ。
 * ゲームで測定した認知特性をもとにHooのプロンプトを最適化する。
 */

import {
  pgTable,
  uuid,
  integer,
  jsonb,
  text,
  boolean,
  timestamp,
  decimal,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// ========================================
// Type Definitions
// ========================================

/** WM (Working Memory) raw data */
export type WmRawData = {
  forwardSpan: number;
  backwardSpan: number;
  sequencingSpan: number;
  mentalMathScore: number;
};

/** PS (Processing Speed) raw data */
export type PsRawData = {
  symbolMatchScore: number;
  codeFillScore: number;
};

/** VC (Verbal Comprehension) raw data */
export type VcRawData = {
  wordBridgeScore: number;
  abstractionLevels: Record<string, number>;
};

/** PR (Perceptual Reasoning) raw data */
export type PrRawData = {
  patternCompleteScore: number;
  difficultyBreakdown: Record<string, number>;
};

/** ATT (Attention) raw data */
export type AttRawData = {
  dPrime: number;
  rtCv: number;
  hitRate: number;
  falseAlarmRate: number;
};

/** Prompt parameters derived from scores */
export type PromptParams = {
  informationDensity: 'low' | 'medium' | 'high';
  chunkSize: 'small' | 'medium' | 'large';
  pacing: 'slow' | 'moderate' | 'fast';
  confirmationFrequency: 'frequent' | 'occasional' | 'minimal';
  modality: 'visual' | 'balanced' | 'verbal';
  abstractionLevel: 'concrete' | 'mixed' | 'abstract';
  responseLength: 'short' | 'moderate' | 'flexible';
};

// ========================================
// Tables
// ========================================

/** ユーザーの認知プロファイル（5変数対応） */
export const cognitiveProfiles = pgTable('cognitive_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),

  // Working Memory (0-100)
  wmScore: integer('wm_score'),
  wmRawData: jsonb('wm_raw_data').$type<WmRawData>(),

  // Processing Speed (0-100)
  psScore: integer('ps_score'),
  psRawData: jsonb('ps_raw_data').$type<PsRawData>(),

  // Verbal Comprehension (0-100)
  vcScore: integer('vc_score'),
  vcRawData: jsonb('vc_raw_data').$type<VcRawData>(),

  // Perceptual Reasoning (0-100)
  prScore: integer('pr_score'),
  prRawData: jsonb('pr_raw_data').$type<PrRawData>(),

  // Attention (0-100)
  attScore: integer('att_score'),
  attRawData: jsonb('att_raw_data').$type<AttRawData>(),

  // Derived
  vcPrBalance: decimal('vc_pr_balance', { precision: 3, scale: 2 }),
  significantPatterns: text('significant_patterns').array(),
  promptParams: jsonb('prompt_params').$type<PromptParams>(),

  // Meta
  measuredAt: timestamp('measured_at', { withTimezone: true }).defaultNow(),
  version: integer('version').default(1),
}, (table) => ({
  userIdIdx: uniqueIndex('idx_cognitive_profiles_user_id').on(table.userId),
}));

/** 測定履歴（トレンド分析用） */
export const measurementHistory = pgTable('measurement_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  gameType: text('game_type').notNull(),
  rawData: jsonb('raw_data').notNull(),
  calculatedScore: jsonb('calculated_score'),
  measuredAt: timestamp('measured_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_measurement_history_user_id').on(table.userId),
  gameTypeIdx: index('idx_measurement_history_game_type').on(table.gameType),
}));

/** Hooプロンプト設定 */
export const hooConfigurations = pgTable('hoo_configurations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  presetName: text('preset_name'),
  customPrompt: text('custom_prompt'),
  variables: jsonb('variables').default({}),
  snippets: text('snippets').array(),
  specialInstructions: text('special_instructions').array(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: uniqueIndex('idx_hoo_configurations_user_id').on(table.userId),
}));

// ========================================
// Type Exports
// ========================================

export type CognitiveProfile = typeof cognitiveProfiles.$inferSelect;
export type NewCognitiveProfile = typeof cognitiveProfiles.$inferInsert;

export type MeasurementHistoryRecord = typeof measurementHistory.$inferSelect;
export type NewMeasurementHistoryRecord = typeof measurementHistory.$inferInsert;

export type HooConfiguration = typeof hooConfigurations.$inferSelect;
export type NewHooConfiguration = typeof hooConfigurations.$inferInsert;
