/**
 * Hoo Settings Store (Zustand)
 * Hooの音声反応アニメーション設定を管理
 */

import { create } from 'zustand';
import { localStorage, HooSettings, DEFAULT_HOO_SETTINGS } from '../cache/storage';

interface HooSettingsState {
  settings: HooSettings;
  isLoaded: boolean;

  // アクション
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<HooSettings>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

export const useHooSettingsStore = create<HooSettingsState>((set) => ({
  settings: DEFAULT_HOO_SETTINGS,
  isLoaded: false,

  /**
   * 設定読み込み
   */
  loadSettings: async () => {
    const settings = await localStorage.getHooSettings();
    set({ settings, isLoaded: true });
  },

  /**
   * 設定更新
   */
  updateSettings: async (updates: Partial<HooSettings>) => {
    await localStorage.saveHooSettings(updates);
    const settings = await localStorage.getHooSettings();
    set({ settings });
  },

  /**
   * デフォルトにリセット
   */
  resetToDefaults: async () => {
    await localStorage.resetHooSettings();
    set({ settings: DEFAULT_HOO_SETTINGS });
  },
}));

// デフォルト値のエクスポート（便利のため）
export { DEFAULT_HOO_SETTINGS };
