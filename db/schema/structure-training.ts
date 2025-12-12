/**
 * Structure Training Schema
 * Phase 3: 構造分析トレーニングシステム
 *
 * 楽曲の構造を理解し、分析する能力を育成するための練習問題と学習記録を管理
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
import { difficultyEnum } from './ear-training';

// ========================================
// Enum Definitions
// ========================================

// 構造分析問題のタイプ
export const formProblemTypeEnum = pgEnum('form_problem_type', [
  'section_order',        // セクション順序当て
  'section_identification', // セクション識別
  'chord_function',       // コード機能分析
  'chord_progression',    // コード進行当て
  'pattern_recognition',  // パターン認識
  'structure_analysis',   // 全体構造分析
  'arrangement_comparison', // アレンジ比較
  'form_type',           // 曲形式判定（ソナタ形式、ロンド形式等）
  'modulation_detection', // 転調検出
  'cadence_identification' // 終止形識別
]);

// セクションタイプ
export const sectionTypeEnum = pgEnum('section_type', [
  'intro',
  'verse',
  'pre_chorus',
  'chorus',
  'bridge',
  'instrumental',
  'solo',
  'breakdown',
  'outro',
  'interlude',
  'coda',
  'refrain'
]);

// 音楽時代区分
export const musicEraEnum = pgEnum('music_era', [
  'baroque',
  'classical',
  'romantic',
  'modern',
  'contemporary',
  'jazz_early',
  'jazz_modern',
  'popular',
  'electronic'
]);

// ========================================
// Type Definitions
// ========================================

// セクション情報の型定義
export type Section = {
  id: string;
  name: string;
  type: string;
  startTime: number;      // 秒単位
  endTime: number;
  startMeasure?: number;  // 小節番号
  endMeasure?: number;
  description?: string;
  dynamics?: string;      // pp, p, mf, f, ff
  texture?: string;       // monophonic, homophonic, polyphonic
};

// コード情報の型定義
export type ChordInfo = {
  time: number;           // 秒単位
  measure?: number;       // 小節番号
  beat?: number;         // 拍
  chord: string;         // コード名（例: "Cmaj7", "Dm7", "G7"）
  function?: string;     // トニック、ドミナント、サブドミナント等
  inversion?: string;    // 転回形
  voicing?: string[];    // ボイシング
};

// 構造アノテーションの型定義
export type StructureAnnotations = {
  sections: Section[];
  chords?: ChordInfo[];
  keySignature?: string;
  keyChanges?: Array<{ measure: number; newKey: string }>;
  timeSignature?: string;
  timeSignatureChanges?: Array<{ measure: number; newTimeSignature: string }>;
  tempo?: number;
  tempoChanges?: Array<{ time: number; newTempo: number }>;
  form?: string;         // "AABA", "Verse-Chorus", "Sonata", etc.
  phraseStructure?: string[]; // ["8+8", "4+4+4+4"]
};

// AI分析結果の型定義
export type AIAnalysis = {
  structureSummary: string;
  keyCharacteristics: string[];
  harmonicAnalysis?: string;
  melodicAnalysis?: string;
  rhythmicAnalysis?: string;
  textureAnalysis?: string;
  similarPieces?: string[];
  stylePeriod?: string;
  composer?: string;
  analysisDate: string;
  modelUsed: string;
};

// ========================================
// Main Tables
// ========================================

/**
 * 構造分析練習問題テーブル
 */
export const formExercises = pgTable('form_exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull(),

  // 基本情報
  title: text('title').notNull(),
  description: text('description'),
  composer: text('composer'),
  pieceTitle: text('piece_title'),

  // 音楽アセット
  audioUrl: text('audio_url'),
  midiUrl: text('midi_url'),
  scoreUrl: text('score_url'),              // 楽譜画像/PDF
  musicXmlUrl: text('music_xml_url'),       // MusicXML形式
  waveformDataUrl: text('waveform_data_url'),
  spectrogramUrl: text('spectrogram_url'),

  // 構造アノテーション
  structureAnnotations: jsonb('structure_annotations').$type<StructureAnnotations>().notNull(),

  // 問題設定
  problemType: formProblemTypeEnum('problem_type').notNull(),
  question: text('question').notNull(),
  instructions: text('instructions'),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: jsonb('options').$type<any[]>(),  // 問題タイプに応じた選択肢 (flexible structure)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  correctAnswer: jsonb('correct_answer').$type<any>().notNull(), // Flexible answer structure
  explanation: text('explanation'),
  hints: jsonb('hints').$type<string[]>(),

  // カテゴライズ
  difficulty: difficultyEnum('difficulty').notNull(),
  tags: jsonb('tags').$type<string[]>(),
  genre: text('genre'),
  era: musicEraEnum('era'),
  instrumentalForces: text('instrumental_forces'), // solo, chamber, orchestral
  duration: integer('duration'),                   // 秒単位

  // 統計情報
  totalAttempts: integer('total_attempts').default(0).notNull(),
  correctAttempts: integer('correct_attempts').default(0).notNull(),
  averageTimeSeconds: integer('average_time_seconds'),
  userRating: numeric('user_rating', { precision: 3, scale: 2 }),

  // AI分析キャッシュ
  aiAnalysis: jsonb('ai_analysis').$type<AIAnalysis>(),

  // 公開設定
  isPublic: boolean('is_public').default(true).notNull(),
  isActive: boolean('is_active').default(true).notNull(),

  // タイムスタンプ
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  creatorIdx: index('idx_form_exercises_creator').on(table.creatorId),
  problemTypeIdx: index('idx_form_exercises_problem_type').on(table.problemType),
  difficultyIdx: index('idx_form_exercises_difficulty').on(table.difficulty),
  eraIdx: index('idx_form_exercises_era').on(table.era),
  genreIdx: index('idx_form_exercises_genre').on(table.genre),
  publicActiveIdx: index('idx_form_exercises_public_active').on(table.isPublic, table.isActive),
  createdAtIdx: index('idx_form_exercises_created_at').on(table.createdAt),
}));

/**
 * ユーザーの構造分析試行記録テーブル
 */
export const formExerciseAttempts = pgTable('form_exercise_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  exerciseId: uuid('exercise_id').notNull(),

  // 試行詳細
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userAnswer: jsonb('user_answer').$type<any>().notNull(), // Flexible answer structure
  isCorrect: boolean('is_correct').notNull(),
  partialCredit: numeric('partial_credit', { precision: 3, scale: 2 }), // 0.00-1.00
  timeSpentSeconds: integer('time_spent_seconds'),
  hintsUsed: integer('hints_used').default(0).notNull(),

  // インタラクション記録
  audioPlaybacks: integer('audio_playbacks').default(0),
  sectionReplays: jsonb('section_replays').$type<Record<string, number>>(),
  toolsUsed: jsonb('tools_used').$type<string[]>(), // piano-roll, spectrogram, etc.

  // 学習洞察
  confidence: integer('confidence'),
  perceivedDifficulty: integer('perceived_difficulty'),
  notes: text('notes'),

  // 詳細分析
  mistakeAnalysis: jsonb('mistake_analysis').$type<{
    mistakeType?: string;
    misidentifiedSections?: string[];
    confusedElements?: string[];
  }>(),

  attemptedAt: timestamp('attempted_at').defaultNow().notNull()
}, (table) => ({
  userIdx: index('idx_form_attempts_user').on(table.userId),
  exerciseIdx: index('idx_form_attempts_exercise').on(table.exerciseId),
  userExerciseIdx: index('idx_form_attempts_user_exercise').on(table.userId, table.exerciseId),
  attemptedAtIdx: index('idx_form_attempts_attempted_at').on(table.attemptedAt),
  correctIdx: index('idx_form_attempts_correct').on(table.isCorrect),
}));

/**
 * ユーザーの構造分析進捗テーブル
 */
export const structureTrainingProgress = pgTable('structure_training_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),

  // 全体統計
  totalExercisesAttempted: integer('total_exercises_attempted').default(0).notNull(),
  totalCorrect: integer('total_correct').default(0).notNull(),
  averagePartialCredit: numeric('average_partial_credit', { precision: 3, scale: 2 }),

  // 問題タイプ別スキルレベル（0-100）
  skillLevels: jsonb('skill_levels').$type<Record<string, number>>().default({}).notNull(),

  // 専門分野
  preferredGenres: jsonb('preferred_genres').$type<string[]>().default([]),
  preferredEras: jsonb('preferred_eras').$type<string[]>().default([]),
  strongestAreas: jsonb('strongest_areas').$type<string[]>().default([]),
  areasForImprovement: jsonb('areas_for_improvement').$type<string[]>().default([]),

  // 学習パターン
  averageAnalysisTime: integer('average_analysis_time'),
  preferredTools: jsonb('preferred_tools').$type<string[]>().default([]),
  learningPath: jsonb('learning_path').$type<Array<{
    date: string;
    exerciseId: string;
    skillGained: string;
  }>>().default([]),

  // 達成度
  certificatesEarned: jsonb('certificates_earned').$type<string[]>().default([]),
  milestones: jsonb('milestones').$type<Array<{
    type: string;
    achievedAt: string;
    description: string;
  }>>().default([]),

  lastPracticeDate: timestamp('last_practice_date'),
  nextRecommendedExerciseId: uuid('next_recommended_exercise_id'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userIdx: index('idx_structure_progress_user').on(table.userId),
  lastPracticeIdx: index('idx_structure_progress_last_practice').on(table.lastPracticeDate),
}));

// ========================================
// Relations
// ========================================

export const formExercisesRelations = relations(formExercises, ({ one, many }) => ({
  creator: one(users, {
    fields: [formExercises.creatorId],
    references: [users.id],
  }),
  attempts: many(formExerciseAttempts),
}));

export const formExerciseAttemptsRelations = relations(formExerciseAttempts, ({ one }) => ({
  user: one(users, {
    fields: [formExerciseAttempts.userId],
    references: [users.id],
  }),
  exercise: one(formExercises, {
    fields: [formExerciseAttempts.exerciseId],
    references: [formExercises.id],
  }),
}));

export const structureTrainingProgressRelations = relations(structureTrainingProgress, ({ one }) => ({
  user: one(users, {
    fields: [structureTrainingProgress.userId],
    references: [users.id],
  }),
  nextExercise: one(formExercises, {
    fields: [structureTrainingProgress.nextRecommendedExerciseId],
    references: [formExercises.id],
  }),
}));

// ========================================
// Type Exports
// ========================================

export type FormExercise = typeof formExercises.$inferSelect;
export type NewFormExercise = typeof formExercises.$inferInsert;

export type FormExerciseAttempt = typeof formExerciseAttempts.$inferSelect;
export type NewFormExerciseAttempt = typeof formExerciseAttempts.$inferInsert;

export type StructureTrainingProgress = typeof structureTrainingProgress.$inferSelect;
export type NewStructureTrainingProgress = typeof structureTrainingProgress.$inferInsert;

// ========================================
// Helper Types
// ========================================

export type FormProblemType = typeof formProblemTypeEnum.enumValues[number];
export type SectionType = typeof sectionTypeEnum.enumValues[number];
export type MusicEra = typeof musicEraEnum.enumValues[number];