/**
 * MUEDlobe - Shared Type Definitions
 */

// ========================================
// Score Types
// ========================================

export interface Scores {
  wm: number;  // Working Memory (0-100)
  ps: number;  // Processing Speed (0-100)
  vc: number;  // Verbal Comprehension (0-100)
  pr: number;  // Perceptual Reasoning (0-100)
  att: number; // Attention (0-100)
}

export interface PromptParams {
  informationDensity: 'low' | 'medium' | 'high';
  chunkSize: 'small' | 'medium' | 'large';
  pacing: 'slow' | 'moderate' | 'fast';
  confirmationFrequency: 'frequent' | 'occasional' | 'minimal';
  modality: 'visual' | 'balanced' | 'verbal';
  abstractionLevel: 'concrete' | 'mixed' | 'abstract';
  responseLength: 'short' | 'moderate' | 'flexible';
}

// ========================================
// Game Types
// ========================================

export type GameType =
  | 'tone-sequence'    // WM-1
  | 'mental-math'      // WM-2
  | 'symbol-match'     // PS-1
  | 'code-fill'        // PS-2
  | 'word-bridge'      // VC-1
  | 'pattern-complete' // PR-1
  | 'focus-flow';      // ATT-1

export type GameStatus = 'pending' | 'playing' | 'completed';

export interface GameResult {
  gameType: GameType;
  rawScore: number;
  rawData: Record<string, unknown>;
  completedAt: string;
}

// ========================================
// Symbol Match Types (PS-1)
// ========================================

export interface SymbolMatchTrial {
  targetSymbols: string[];
  comparisonSymbols: string[];
  hasTarget: boolean;
  userAnswer: boolean | null;
  correct: boolean | null;
  responseTime: number | null;
}

export interface SymbolMatchResult {
  correct: number;
  incorrect: number;
  totalAttempted: number;
  rawScore: number; // correct - incorrect
}

// ========================================
// Session Types
// ========================================

export interface MeasurementSession {
  id: string;
  startedAt: string;
  games: Partial<Record<GameType, GameResult>>;
  status: 'in_progress' | 'completed';
  completedAt?: string;
}

// ========================================
// Pattern Types
// ========================================

export type SignificantPattern =
  // 2-variable patterns (12)
  | 'high_wm_low_ps' | 'low_wm_high_ps'
  | 'high_wm_low_vc' | 'low_wm_high_vc'
  | 'high_wm_low_pr' | 'low_wm_high_pr'
  | 'high_ps_low_vc' | 'low_ps_high_vc'
  | 'high_ps_low_pr' | 'low_ps_high_pr'
  | 'high_vc_low_pr' | 'low_vc_high_pr'
  // Composite types (5)
  | 'architect_type'
  | 'performer_type'
  | 'theorist_type'
  | 'visualizer_type'
  | 'balanced_type'
  // ATT modifiers
  | 'low_attention_modifier'
  | 'high_attention_modifier';

// ========================================
// Hoo Configuration Types
// ========================================

export interface HooPromptConfig {
  prompt: string;
  variables: Record<string, number | string>;
  patterns: SignificantPattern[];
  specialInstructions: string[];
  activeSnippets: string[];
  version: number;
  lastUpdated: string;
}
