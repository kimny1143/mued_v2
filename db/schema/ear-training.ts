/**
 * Ear Training Schema
 * Phase 2: 聴覚トレーニングシステム
 *
 * 「差分を聴く耳」を育成するための練習問題と学習記録を管理
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
  numeric,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from '../schema';

// ========================================
// Enum Definitions
// ========================================

// 耳トレーニングのタイプ
export const earTypeEnum = pgEnum('ear_type', [
  'eq',           // EQ（イコライザー）の差分
  'balance',      // L/Rバランスの差分
  'rhythm',       // リズム・タイミングの差分
  'pitch',        // ピッチの差分
  'dynamics',     // ダイナミクス（音量変化）の差分
  'compression',  // コンプレッション効果の差分
  'reverb',       // リバーブ効果の差分
  'distortion',   // ディストーション・サチュレーションの差分
  'modulation',   // モジュレーション効果の差分
]);

// 難易度レベル
export const difficultyEnum = pgEnum('difficulty', [
  'beginner',
  'intermediate',
  'advanced',
  'expert'
]);

// 楽器カテゴリ
export const instrumentEnum = pgEnum('instrument', [
  'piano',
  'guitar',
  'bass',
  'drums',
  'violin',
  'vocal',
  'synthesizer',
  'orchestral',
  'electronic',
  'mixed'
]);

// ========================================
// Type Definitions
// ========================================

// 差分メタデータの型定義
export type DifferenceMetadata = {
  type: string;                        // 差分の種類
  parameters: Record<string, any>;     // 具体的なパラメータ
  description: string;                 // 人間が読める説明
  technicalDetails?: string;           // 技術的詳細
  frequency?: number;                  // 周波数（Hz）- EQ用
  gain?: number;                       // ゲイン（dB）
  timeOffset?: number;                 // 時間オフセット（ms）- リズム用
  semitones?: number;                  // 半音単位のピッチシフト
};

// 統計情報の型定義
export type ExerciseStatistics = {
  totalAttempts: number;
  correctAttempts: number;
  averageTimeSeconds: number;
  difficultyRating: number;  // ユーザー評価の平均
  lastAttemptDate?: string;
};

// ========================================
// Main Tables
// ========================================

/**
 * 耳トレーニング練習問題テーブル
 */
export const earExercises = pgTable('ear_exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull(),

  // 基本情報
  title: text('title').notNull(),
  description: text('description'),
  type: earTypeEnum('type').notNull(),

  // 音声アセット
  audioAUrl: text('audio_a_url').notNull(),       // バージョンA（オリジナルまたは参照）
  audioBUrl: text('audio_b_url').notNull(),       // バージョンB（変更版）
  referenceUrl: text('reference_url'),            // 元の未処理音源
  waveformDataUrl: text('waveform_data_url'),     // 波形表示用データ

  // 差分情報
  differenceMetadata: jsonb('difference_metadata').$type<DifferenceMetadata>().notNull(),

  // 正解と解説
  correctAnswer: text('correct_answer').notNull(),  // 'A', 'B', 'same', または具体的な値
  explanation: text('explanation'),                 // 正解の解説
  hints: jsonb('hints').$type<string[]>(),         // ヒント（段階的に表示）

  // カテゴライズ
  difficulty: difficultyEnum('difficulty').notNull(),
  tags: jsonb('tags').$type<string[]>(),
  instrument: instrumentEnum('instrument'),
  genre: text('genre'),                            // jazz, classical, rock, etc.
  bpm: integer('bpm'),                             // テンポ情報

  // 統計情報
  totalAttempts: integer('total_attempts').default(0).notNull(),
  correctAttempts: integer('correct_attempts').default(0).notNull(),
  averageTimeSeconds: integer('average_time_seconds'),
  userRating: numeric('user_rating', { precision: 3, scale: 2 }), // 1.00-5.00

  // 公開設定
  isPublic: boolean('is_public').default(true).notNull(),
  isActive: boolean('is_active').default(true).notNull(),

  // タイムスタンプ
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  creatorIdx: index('idx_ear_exercises_creator').on(table.creatorId),
  typeIdx: index('idx_ear_exercises_type').on(table.type),
  difficultyIdx: index('idx_ear_exercises_difficulty').on(table.difficulty),
  instrumentIdx: index('idx_ear_exercises_instrument').on(table.instrument),
  publicActiveIdx: index('idx_ear_exercises_public_active').on(table.isPublic, table.isActive),
  createdAtIdx: index('idx_ear_exercises_created_at').on(table.createdAt),
}));

/**
 * ユーザーの練習試行記録テーブル
 */
export const earExerciseAttempts = pgTable('ear_exercise_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  exerciseId: uuid('exercise_id').notNull(),

  // 試行詳細
  userAnswer: text('user_answer').notNull(),       // ユーザーの回答
  isCorrect: boolean('is_correct').notNull(),      // 正誤
  timeSpentSeconds: integer('time_spent_seconds'), // 回答時間（秒）
  hintsUsed: integer('hints_used').default(0).notNull(),
  audioPlayCount: jsonb('audio_play_count').$type<{ A: number; B: number }>(),

  // 学習洞察
  confidence: integer('confidence'),                // 自信度（1-5）
  perceivedDifficulty: integer('perceived_difficulty'), // 体感難易度（1-5）
  notes: text('notes'),                            // ユーザーのメモ

  // 環境情報
  deviceType: text('device_type'),                 // desktop, mobile, tablet
  audioDevice: text('audio_device'),               // ヘッドホン、スピーカー等
  listeningEnvironment: text('listening_environment'), // quiet, noisy, etc.

  attemptedAt: timestamp('attempted_at').defaultNow().notNull()
}, (table) => ({
  userIdx: index('idx_ear_attempts_user').on(table.userId),
  exerciseIdx: index('idx_ear_attempts_exercise').on(table.exerciseId),
  userExerciseIdx: index('idx_ear_attempts_user_exercise').on(table.userId, table.exerciseId),
  attemptedAtIdx: index('idx_ear_attempts_attempted_at').on(table.attemptedAt),
  correctIdx: index('idx_ear_attempts_correct').on(table.isCorrect),
}));

/**
 * ユーザーの耳トレーニング進捗テーブル
 */
export const earTrainingProgress = pgTable('ear_training_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),

  // 全体統計
  totalExercisesAttempted: integer('total_exercises_attempted').default(0).notNull(),
  totalCorrect: integer('total_correct').default(0).notNull(),
  currentStreak: integer('current_streak').default(0).notNull(),
  longestStreak: integer('longest_streak').default(0).notNull(),

  // タイプ別スキルレベル（0-100）
  skillLevels: jsonb('skill_levels').$type<Record<string, number>>().default({}).notNull(),

  // 学習パターン
  preferredDifficulty: difficultyEnum('preferred_difficulty'),
  averageSessionMinutes: integer('average_session_minutes'),
  mostPracticedType: earTypeEnum('most_practiced_type'),
  weakestArea: earTypeEnum('weakest_area'),

  // マイルストーン
  achievements: jsonb('achievements').$type<string[]>().default([]).notNull(),
  lastPracticeDate: timestamp('last_practice_date'),
  nextRecommendedExerciseId: uuid('next_recommended_exercise_id'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userIdx: index('idx_ear_progress_user').on(table.userId),
  lastPracticeIdx: index('idx_ear_progress_last_practice').on(table.lastPracticeDate),
}));

// ========================================
// Relations
// ========================================

export const earExercisesRelations = relations(earExercises, ({ one, many }) => ({
  creator: one(users, {
    fields: [earExercises.creatorId],
    references: [users.id],
  }),
  attempts: many(earExerciseAttempts),
}));

export const earExerciseAttemptsRelations = relations(earExerciseAttempts, ({ one }) => ({
  user: one(users, {
    fields: [earExerciseAttempts.userId],
    references: [users.id],
  }),
  exercise: one(earExercises, {
    fields: [earExerciseAttempts.exerciseId],
    references: [earExercises.id],
  }),
}));

export const earTrainingProgressRelations = relations(earTrainingProgress, ({ one }) => ({
  user: one(users, {
    fields: [earTrainingProgress.userId],
    references: [users.id],
  }),
  nextExercise: one(earExercises, {
    fields: [earTrainingProgress.nextRecommendedExerciseId],
    references: [earExercises.id],
  }),
}));

// ========================================
// Type Exports
// ========================================

export type EarExercise = typeof earExercises.$inferSelect;
export type NewEarExercise = typeof earExercises.$inferInsert;

export type EarExerciseAttempt = typeof earExerciseAttempts.$inferSelect;
export type NewEarExerciseAttempt = typeof earExerciseAttempts.$inferInsert;

export type EarTrainingProgress = typeof earTrainingProgress.$inferSelect;
export type NewEarTrainingProgress = typeof earTrainingProgress.$inferInsert;

// ========================================
// Helper Types
// ========================================

export type EarType = typeof earTypeEnum.enumValues[number];
export type Difficulty = typeof difficultyEnum.enumValues[number];
export type Instrument = typeof instrumentEnum.enumValues[number];