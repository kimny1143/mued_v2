/**
 * ThemeProvider - ダーク/ライトテーマ切替
 *
 * 機能:
 * - システム設定に追従（デフォルト）
 * - 手動でダーク/ライト切替可能
 * - AsyncStorageで設定を永続化
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors } from '../constants/theme';

// テーマモード
export type ThemeMode = 'system' | 'light' | 'dark';

// カラー型
export type ThemeColors = typeof darkColors;

// コンテキスト値の型
interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = '@muednote_theme_mode';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // 保存されたテーマ設定を読み込み
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved && (saved === 'system' || saved === 'light' || saved === 'dark')) {
          setModeState(saved as ThemeMode);
        }
      } catch (error) {
        console.error('[Theme] Failed to load theme:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  // テーマモードを設定・保存
  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      console.error('[Theme] Failed to save theme:', error);
    }
  };

  // テーマをトグル（system -> light -> dark -> system）
  const toggleTheme = () => {
    const nextMode: ThemeMode =
      mode === 'system' ? 'light' :
      mode === 'light' ? 'dark' : 'system';
    setMode(nextMode);
  };

  // 実際のダーク判定
  const isDark = useMemo(() => {
    if (mode === 'system') {
      return systemColorScheme === 'dark';
    }
    return mode === 'dark';
  }, [mode, systemColorScheme]);

  // カラーパレット選択
  const colors = useMemo(() => {
    return isDark ? darkColors : lightColors;
  }, [isDark]);

  const value = useMemo(() => ({
    mode,
    isDark,
    colors,
    setMode,
    toggleTheme,
  }), [mode, isDark, colors]);

  // 設定読み込み前は何も表示しない（フラッシュ防止）
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * テーマを使用するフック
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
