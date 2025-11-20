/**
 * Question Constants
 *
 * Centralized constants for interview question generation
 * Focus areas, depths, and related validation logic
 *
 * Phase 1.3: Extracted from duplicated code across services
 */

import { z } from 'zod';

// ========================================
// Focus Areas
// ========================================

/**
 * Available focus areas for musical analysis and interview questions
 */
export const FOCUS_AREAS = [
  'harmony',
  'melody',
  'rhythm',
  'mix',
  'emotion',
  'image',
  'structure',
] as const;

export type FocusArea = (typeof FOCUS_AREAS)[number];

/**
 * Zod schema for focus area validation
 */
export const focusAreaSchema = z.enum([
  'harmony',
  'melody',
  'rhythm',
  'mix',
  'emotion',
  'image',
  'structure',
]);

/**
 * Type guard: Check if a string is a valid FocusArea
 *
 * @param value - String to validate
 * @returns true if value is a valid FocusArea
 */
export function isValidFocusArea(value: unknown): value is FocusArea {
  return typeof value === 'string' && FOCUS_AREAS.includes(value as FocusArea);
}

/**
 * Translate focus area to Japanese for UI display
 */
export const FOCUS_AREA_TRANSLATIONS: Record<FocusArea, string> = {
  harmony: '和音・コード進行',
  melody: 'メロディ',
  rhythm: 'リズム・グルーブ',
  mix: 'ミックス・音響',
  emotion: '感情表現',
  image: '音像・イメージ',
  structure: '楽曲構成',
};

// ========================================
// Question Depths
// ========================================

/**
 * Available depth levels for interview questions
 */
export const QUESTION_DEPTHS = ['shallow', 'medium', 'deep'] as const;

export type QuestionDepth = (typeof QUESTION_DEPTHS)[number];

/**
 * Zod schema for question depth validation
 */
export const questionDepthSchema = z.enum(['shallow', 'medium', 'deep']);

/**
 * Type guard: Check if a string is a valid QuestionDepth
 *
 * @param value - String to validate
 * @returns true if value is a valid QuestionDepth
 */
export function isValidDepth(value: unknown): value is QuestionDepth {
  return typeof value === 'string' && QUESTION_DEPTHS.includes(value as QuestionDepth);
}

/**
 * Translate question depth to Japanese for UI display
 */
export const QUESTION_DEPTH_TRANSLATIONS: Record<QuestionDepth, string> = {
  shallow: '浅い（事実確認）',
  medium: '中程度（理由探索）',
  deep: '深い（本質追求）',
};

/**
 * Depth level descriptions for documentation
 */
export const QUESTION_DEPTH_DESCRIPTIONS: Record<QuestionDepth, string> = {
  shallow: 'Surface-level questions about facts and observations (What did you do?)',
  medium: 'Mid-level questions exploring reasons and methods (Why did you choose this?)',
  deep: 'Deep questions pursuing essence and intention (What is the core you want to express?)',
};
