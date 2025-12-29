/**
 * MUEDnote Design Tokens
 * ダーク/ライトテーマ対応
 */

// ダークテーマカラー
export const darkColors = {
  // 背景
  background: '#1a1a2e',
  backgroundSecondary: '#16213e',
  backgroundTertiary: '#0f3460',

  // プライマリ（emerald系）
  primary: '#059669',
  primaryLight: '#10b981',

  // セカンダリ（purple系 - DAW連携など）
  secondary: '#8b5cf6',
  secondaryLight: '#a78bfa',

  // テキスト
  textPrimary: '#ffffff',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  // ボーダー
  border: '#2d3748',
  borderLight: '#4a5568',

  // ステータス
  recording: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#dc2626',
};

// ライトテーマカラー
export const lightColors = {
  // 背景
  background: '#f8fafc',
  backgroundSecondary: '#ffffff',
  backgroundTertiary: '#f1f5f9',

  // プライマリ（emerald系）
  primary: '#059669',
  primaryLight: '#10b981',

  // セカンダリ（purple系 - DAW連携など）
  secondary: '#7c3aed',
  secondaryLight: '#8b5cf6',

  // テキスト
  textPrimary: '#1e293b',
  textSecondary: '#475569',
  textMuted: '#94a3b8',

  // ボーダー
  border: '#e2e8f0',
  borderLight: '#cbd5e1',

  // ステータス
  recording: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#dc2626',
};

// デフォルトカラー（後方互換性のため）
export const colors = darkColors;

// スペーシング
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

// フォントサイズ
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 64,
};

// フォントウェイト
export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// ボーダー半径
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

// タイマーオプションは types/timer.ts の FOCUS_MODES に移行
// import { FOCUS_MODES } from '../types/timer';

/**
 * Hooサイズ設定
 * 画面ごとのHooサイズを一元管理
 */
export type HooSizeKey = 'small' | 'medium' | 'mediumLarge' | 'large';

export const hooSizes = {
  // メイン画面（Home, Session）- 主役サイズ
  main: 'large' as HooSizeKey,
  // サブ画面（Break）- 中サイズ
  sub: 'medium' as HooSizeKey,
  // コンパクト画面（Review, Loading）- 小サイズ
  compact: 'small' as HooSizeKey,
};
