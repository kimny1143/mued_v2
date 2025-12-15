/**
 * MUEDnote Design Tokens
 * Modacityスタイルのダークテーマ
 */

// カラーパレット
export const colors = {
  // 背景
  background: '#1a1a2e',
  backgroundSecondary: '#16213e',
  backgroundTertiary: '#0f3460',

  // プライマリ
  primary: '#6c5ce7',
  primaryLight: '#a29bfe',

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

// タイマーオプション
export const TIMER_OPTIONS = [
  { label: '60分', value: 3600 },
  { label: '90分', value: 5400 },
  { label: '120分', value: 7200 },
];
