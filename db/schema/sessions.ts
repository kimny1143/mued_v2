/**
 * Sessions Schema - MUEDnote Phase 2
 * AI Interview-driven Composition/Practice Logging System
 *
 * このスキーマは、AIインタビュアーが作曲家の非言語的なプロセスを
 * 質問を通じて構造化・記録するためのテーブル群を定義します。
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

/**
 * セッションタイプ - ユーザーの活動種別
 */
export const sessionTypeEnum = pgEnum('session_type', [
  'composition',      // 作曲
  'practice',         // 練習
  'mix',              // ミックス
  'ear_training',     // 耳トレーニング
  'listening',        // リスニング分析
  'theory',           // 音楽理論
  'other',            // その他
]);

/**
 * インタビュー質問のフォーカスエリア
 */
export const interviewFocusEnum = pgEnum('interview_focus', [
  'harmony',          // 和音・コード進行
  'melody',           // メロディライン
  'rhythm',           // リズム・グルーブ
  'mix',              // ミックス・音響バランス
  'emotion',          // 感情・表現意図
  'image',            // 音像・空間イメージ
  'structure',        // 楽曲構造・展開
]);

/**
 * 質問の深さ
 */
export const interviewDepthEnum = pgEnum('interview_depth', [
  'shallow',   // 表層的（初心者向け）
  'medium',    // 中程度（一般的な深さ）
  'deep',      // 深い（理論的・哲学的）
]);

/**
 * セッションステータス
 */
export const sessionStatusEnum = pgEnum('session_status', [
  'draft',          // 下書き（作成中）
  'interviewing',   // インタビュー中
  'completed',      // 完了
  'archived',       // アーカイブ済み
]);

// ========================================
// Type Definitions
// ========================================

/**
 * DAWメタデータ構造
 * MVP: テキスト推定値
 * Final: WAV/MIDI解析による実測値
 */
export type DAWMetadata = {
  dawName?: string;              // DAW名（Pro Tools, Logic, Ableton等）
  tempo?: number;                // BPM
  timeSignature?: string;        // 拍子（4/4, 3/4等）
  keyEstimate?: string;          // 推定キー（C, Dm等）
  barsTouched?: {                // 操作した小節範囲
    from: number;
    to: number;
  };
  projectFileName?: string;      // プロジェクトファイル名
  totalBars?: number;            // プロジェクト全体の小節数
  trackCount?: number;           // トラック数
};

/**
 * AIアノテーション - Analyzerの推定結果
 */
export type AIAnnotations = {
  focusArea?: string;            // 推定フォーカスエリア（harmony, melody等）
  intentHypothesis?: string;     // 意図の仮説（「落ち着かせようとしている」等）
  confidence?: number;           // 推定信頼度（0.0-1.0）
  analysisMethod?: 'text_inference' | 'midi_analysis' | 'wav_analysis'; // 分析手法
};

/**
 * セッション分析データ（SessionAnalysisテーブルの内容）
 */
export type SessionAnalysisData = {
  focusArea: string;             // harmony | melody | rhythm | mix | emotion | image | structure
  intentHypothesis: string;      // 意図の自然言語仮説
  barsChanged?: number[];        // 変更された小節番号のリスト
  tracksChanged?: string[];      // 変更されたトラック名のリスト
  // MIDI解析データ（Final版で追加）
  pitchClassHistogram?: number[]; // 音高クラスヒストグラム（12次元）
  simultaneity?: number;         // 和音の厚み（平均同時発音数）
  onsetDensity?: number;         // 音符密度（音符数/小節）
  quantizeDeviation?: number;    // クオンタイズからのズレ量
  // WAV解析データ（Final版で追加）
  lufs?: number;                 // ラウドネス（LUFS）
  dynamicRange?: number;         // ダイナミクスレンジ（dB）
  spectralBalance?: {            // 周波数帯域バランス
    low: number;                 // 低域（20-250Hz）
    mid: number;                 // 中域（250-4000Hz）
    high: number;                // 高域（4000-20000Hz）
  };
};

/**
 * 添付ファイル情報
 */
export type SessionAttachment = {
  type: 'midi' | 'wav' | 'mp3' | 'image' | 'video' | 'document' | 'other';
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
  uploadedAt?: string;
};

// ========================================
// Main Tables
// ========================================

/**
 * セッションテーブル - 制作・練習セッションの基本情報
 */
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),  // 外部キー制約はマイグレーションで追加

  // セッション分類
  type: sessionTypeEnum('type').notNull(),
  status: sessionStatusEnum('status').notNull().default('draft'),

  // 基本情報
  title: text('title').notNull(),                 // セッションタイトル（1行）
  projectId: uuid('project_id'),                  // 関連プロジェクトID（将来的な拡張用）
  projectName: text('project_name'),              // プロジェクト名

  // ユーザー入力
  userShortNote: text('user_short_note').notNull(), // ユーザーの最初の短文（1-2行）

  // DAWメタデータ（MVP: 推定値、Final: 実測値）
  dawMeta: jsonb('daw_meta').$type<DAWMetadata>(),

  // AI推定結果
  aiAnnotations: jsonb('ai_annotations').$type<AIAnnotations>(),

  // 添付ファイル
  attachments: jsonb('attachments').$type<SessionAttachment[]>().default([]),

  // プライバシー設定
  isPublic: boolean('is_public').default(false).notNull(),
  shareWithMentor: boolean('share_with_mentor').default(true).notNull(),

  // タイムスタンプ
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),         // セッション完了日時
}, (table) => ({
  // インデックス設計
  userIdx: index('idx_sessions_user').on(table.userId),
  typeIdx: index('idx_sessions_type').on(table.type),
  statusIdx: index('idx_sessions_status').on(table.status),
  userCreatedIdx: index('idx_sessions_user_created').on(table.userId, table.createdAt),
  userStatusIdx: index('idx_sessions_user_status').on(table.userId, table.status),
  publicIdx: index('idx_sessions_public').on(table.isPublic),
  projectIdx: index('idx_sessions_project').on(table.projectId),
}));

/**
 * セッション分析テーブル - Analyzerの詳細出力
 * セッションあたり1レコード（1:1関係）
 */
export const sessionAnalyses = pgTable('session_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().unique(), // 外部キー + UNIQUE制約

  // 分析結果（JSONB形式）
  analysisData: jsonb('analysis_data').$type<SessionAnalysisData>().notNull(),

  // メタ情報
  analysisVersion: text('analysis_version').notNull().default('mvp-1.0'), // 分析アルゴリズムバージョン
  confidence: integer('confidence').default(0),     // 信頼度スコア（0-100）

  // タイムスタンプ
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  sessionIdIdx: index('idx_session_analyses_session').on(table.sessionId),
}));

/**
 * インタビュー質問テーブル - AIが生成する質問
 */
export const interviewQuestions = pgTable('interview_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull(),        // 外部キー制約はマイグレーションで追加

  // 質問内容
  text: text('text').notNull(),                   // 質問文
  focus: interviewFocusEnum('focus').notNull(),   // フォーカスエリア
  depth: interviewDepthEnum('depth').notNull(),   // 質問の深さ

  // 表示順序
  order: integer('order').notNull().default(0),   // セッション内での表示順

  // 質問生成メタデータ
  generatedBy: text('generated_by').default('ai'), // 'ai' or 'template' or 'custom'
  templateId: text('template_id'),                // 使用したテンプレートID（RAG用）
  ragContext: jsonb('rag_context'),               // RAGで使用したコンテキスト情報

  // タイムスタンプ
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  sessionIdIdx: index('idx_interview_questions_session').on(table.sessionId),
  sessionOrderIdx: index('idx_interview_questions_session_order').on(table.sessionId, table.order),
  focusIdx: index('idx_interview_questions_focus').on(table.focus),
}));

/**
 * インタビュー回答テーブル - ユーザーの回答
 */
export const interviewAnswers = pgTable('interview_answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull(),        // 外部キー制約はマイグレーションで追加
  questionId: uuid('question_id').notNull(),      // 外部キー制約はマイグレーションで追加

  // 回答内容
  text: text('text').notNull(),                   // ユーザーの回答テキスト

  // AI解析結果
  aiInsights: jsonb('ai_insights').$type<{
    keyPhrases?: string[];                        // 抽出されたキーフレーズ
    technicalTerms?: string[];                    // 検出された技術用語
    emotionalTone?: string;                       // 感情的トーン
    suggestedTags?: string[];                     // 提案タグ
  }>(),

  // タイムスタンプ
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  sessionIdIdx: index('idx_interview_answers_session').on(table.sessionId),
  questionIdIdx: index('idx_interview_answers_question').on(table.questionId),
  sessionQuestionIdx: index('idx_interview_answers_session_question').on(table.sessionId, table.questionId),
}));

// ========================================
// Relations
// ========================================

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  analysis: one(sessionAnalyses, {
    fields: [sessions.id],
    references: [sessionAnalyses.sessionId],
  }),
  questions: many(interviewQuestions),
  answers: many(interviewAnswers),
}));

export const sessionAnalysesRelations = relations(sessionAnalyses, ({ one }) => ({
  session: one(sessions, {
    fields: [sessionAnalyses.sessionId],
    references: [sessions.id],
  }),
}));

export const interviewQuestionsRelations = relations(interviewQuestions, ({ one, many }) => ({
  session: one(sessions, {
    fields: [interviewQuestions.sessionId],
    references: [sessions.id],
  }),
  answers: many(interviewAnswers),
}));

export const interviewAnswersRelations = relations(interviewAnswers, ({ one }) => ({
  session: one(sessions, {
    fields: [interviewAnswers.sessionId],
    references: [sessions.id],
  }),
  question: one(interviewQuestions, {
    fields: [interviewAnswers.questionId],
    references: [interviewQuestions.id],
  }),
}));

// ========================================
// Type Exports
// ========================================

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type SessionAnalysis = typeof sessionAnalyses.$inferSelect;
export type NewSessionAnalysis = typeof sessionAnalyses.$inferInsert;

export type InterviewQuestion = typeof interviewQuestions.$inferSelect;
export type NewInterviewQuestion = typeof interviewQuestions.$inferInsert;

export type InterviewAnswer = typeof interviewAnswers.$inferSelect;
export type NewInterviewAnswer = typeof interviewAnswers.$inferInsert;

// ========================================
// Helper Types
// ========================================

export type SessionType = typeof sessionTypeEnum.enumValues[number];
export type InterviewFocus = typeof interviewFocusEnum.enumValues[number];
export type InterviewDepth = typeof interviewDepthEnum.enumValues[number];
export type SessionStatus = typeof sessionStatusEnum.enumValues[number];

/**
 * セッション作成時の入力型
 */
export interface CreateSessionInput {
  userId: string;
  type: SessionType;
  title: string;
  projectName?: string;
  userShortNote: string;
  dawMeta?: DAWMetadata;
  isPublic?: boolean;
  shareWithMentor?: boolean;
}

/**
 * セッションフィルタ条件
 */
export interface SessionFilter {
  userId?: string;
  type?: SessionType;
  status?: SessionStatus;
  projectId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  isPublic?: boolean;
}

/**
 * インタビューQ&Aペア（UIで使用）
 */
export interface InterviewQAPair {
  question: InterviewQuestion;
  answer?: InterviewAnswer;
}

/**
 * セッション詳細情報（結合クエリ結果）
 */
export interface SessionWithDetails extends Session {
  analysis?: SessionAnalysis;
  questions?: InterviewQuestion[];
  answers?: InterviewAnswer[];
  qaPairs?: InterviewQAPair[];
}
