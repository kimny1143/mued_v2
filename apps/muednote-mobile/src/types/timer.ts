/**
 * Timer Types - フォーカスモード定義
 *
 * 研究に基づいた集中メソッド:
 * - Pomodoro: 25分集中 + 5分休憩
 * - Standard: 50分集中 + 17分休憩 (DeskTime研究)
 * - Deep Work: 90分集中 + 20分休憩 (ウルトラディアンリズム)
 * - Custom: ユーザー設定 (最大120分)
 */

// FocusModeIdはapi/types.tsで定義されているものを使用
import type { FocusModeId } from '../api/types';
export type { FocusModeId } from '../api/types';

export interface FocusMode {
  id: FocusModeId;
  label: string;
  shortLabel: string;
  icon: string; // Lucide icon name
  focusDuration: number; // seconds
  breakDuration: number; // seconds
  description: string;
  hooMessage: string;
}

export const FOCUS_MODES: FocusMode[] = [
  {
    id: 'pomodoro',
    label: 'Pomodoro',
    shortLabel: 'Pomo',
    icon: 'Timer',
    focusDuration: 25 * 60,
    breakDuration: 5 * 60,
    description: '短い集中と休憩を繰り返す',
    hooMessage: '25分集中して5分休む、ポモドーロだね。短く区切ってリズムよく！',
  },
  {
    id: 'standard',
    label: 'Standard',
    shortLabel: 'Std',
    icon: 'Coffee',
    focusDuration: 50 * 60,
    breakDuration: 17 * 60,
    description: 'バランスの取れた標準セッション',
    hooMessage: '50分の標準セッション。バランスよく集中できるよ！',
  },
  {
    id: 'deepwork',
    label: 'Deep Work',
    shortLabel: 'Deep',
    icon: 'Brain',
    focusDuration: 90 * 60,
    breakDuration: 20 * 60,
    description: '創作・没入作業に最適',
    hooMessage: '90分のディープワーク。創作に没頭するならこれだね！',
  },
  {
    id: 'custom',
    label: 'Custom',
    shortLabel: 'Cust',
    icon: 'Settings',
    focusDuration: 0, // カスタム値を使用
    breakDuration: 0,
    description: '自分だけの時間設定',
    hooMessage: '自分だけの時間設定。最大120分まで選べるよ！',
  },
];

/**
 * モードIDからモード情報を取得
 */
export function getFocusMode(id: FocusModeId): FocusMode | undefined {
  return FOCUS_MODES.find((mode) => mode.id === id);
}

/**
 * カスタムモードの制限
 */
export const CUSTOM_MODE_LIMITS = {
  minFocusDuration: 5 * 60, // 5分
  maxFocusDuration: 120 * 60, // 120分
  minBreakDuration: 0,
  maxBreakDuration: 30 * 60, // 30分
  step: 5 * 60, // 5分刻み
};

/**
 * 1日の累計制限
 */
export const DAILY_LIMITS = {
  warningThreshold: 4 * 60 * 60, // 4時間でアラート
};
