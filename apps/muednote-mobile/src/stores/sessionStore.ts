/**
 * MUEDnote Session Store (Zustand)
 * セッション状態管理（バッチ処理方式）
 */

import { create } from 'zustand';
import { localStorage, UserSettings, DailyTotal } from '../cache/storage';
import { LocalSession, LocalLog, FocusModeId } from '../api/types';

// アプリの状態
type AppState = 'idle' | 'recording' | 'processing' | 'reviewing';

interface SessionState {
  // アプリ状態
  appState: AppState;
  isInitialized: boolean;
  initError: string | null;

  // セッション状態
  currentSession: LocalSession | null;
  elapsedSeconds: number;
  isRecording: boolean;

  // Whisper状態
  isWhisperReady: boolean;

  // 設定
  settings: UserSettings;

  // 1日の累計
  dailyTotal: DailyTotal;

  // アクション
  initialize: () => Promise<void>;
  startSession: (durationSec: number, mode?: FocusModeId) => Promise<LocalSession>;
  endSession: (memo?: string, audioFilePath?: string) => Promise<LocalSession | null>;
  cancelSession: () => Promise<void>;
  tick: () => void;
  setWhisperReady: (ready: boolean) => void;
  setRecording: (recording: boolean) => void;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  loadDailyTotal: () => Promise<void>;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  // 初期状態
  appState: 'idle',
  isInitialized: false,
  initError: null,
  currentSession: null,
  elapsedSeconds: 0,
  isRecording: false,
  isWhisperReady: false,
  settings: {
    defaultDuration: 3600,
    customDuration: 45 * 60, // 45分
    enableVAD: false, // バッチ処理方式ではVAD不要
    autoSync: true,
  },
  dailyTotal: {
    date: new Date().toISOString().split('T')[0],
    totalSeconds: 0,
    sessionCount: 0,
  },

  /**
   * 初期化
   */
  initialize: async () => {
    try {
      // 設定読み込み
      const settings = await localStorage.getSettings();

      // 1日の累計読み込み
      const dailyTotal = await localStorage.getDailyTotal();

      // アクティブセッションがあれば復元
      const activeSession = await localStorage.getCurrentSession();

      set({
        isInitialized: true,
        initError: null,
        settings,
        dailyTotal,
        currentSession: activeSession,
        appState: activeSession ? 'recording' : 'idle',
        elapsedSeconds: activeSession
          ? Math.floor(
              (Date.now() - new Date(activeSession.started_at).getTime()) / 1000
            )
          : 0,
      });

      console.log('[Store] Initialized', { hasActiveSession: !!activeSession, dailyTotal });
    } catch (error) {
      console.error('[Store] Initialize error:', error);
      set({
        isInitialized: true,
        initError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  /**
   * セッション開始
   */
  startSession: async (durationSec: number, mode: FocusModeId = 'standard') => {
    const session = await localStorage.createSession(durationSec, mode);

    set({
      currentSession: session,
      elapsedSeconds: 0,
      appState: 'recording',
      isRecording: true,
    });

    console.log('[Store] Session started:', session.id, 'mode:', mode);
    return session;
  },

  /**
   * セッション終了
   */
  endSession: async (memo?: string, audioFilePath?: string) => {
    const { currentSession, elapsedSeconds } = get();
    if (!currentSession) return null;

    const session = await localStorage.endSession(currentSession.id, memo, audioFilePath);

    // 1日の累計に追加
    const dailyTotal = await localStorage.addToDailyTotal(elapsedSeconds);

    set({
      currentSession: null,
      appState: 'reviewing',
      isRecording: false,
      dailyTotal,
    });

    console.log('[Store] Session ended:', currentSession.id, 'Duration:', elapsedSeconds, 'DailyTotal:', dailyTotal);
    return session;
  },

  /**
   * セッションキャンセル（破棄）
   */
  cancelSession: async () => {
    const { currentSession } = get();
    if (!currentSession) return;

    await localStorage.deleteSession(currentSession.id);

    set({
      currentSession: null,
      elapsedSeconds: 0,
      appState: 'idle',
      isRecording: false,
    });

    console.log('[Store] Session cancelled:', currentSession.id);
  },

  /**
   * タイマーティック（1秒ごとに呼ばれる）
   */
  tick: () => {
    const { appState, currentSession, elapsedSeconds } = get();
    if (appState !== 'recording' || !currentSession) return;

    const newElapsed = elapsedSeconds + 1;

    // タイマー終了チェック
    if (newElapsed >= currentSession.duration_sec) {
      console.log('[Store] Timer ended');
    }

    set({ elapsedSeconds: newElapsed });
  },

  /**
   * Whisper準備完了設定
   */
  setWhisperReady: (ready: boolean) => {
    set({ isWhisperReady: ready });
  },

  /**
   * 録音状態設定
   */
  setRecording: (recording: boolean) => {
    set({ isRecording: recording });
  },

  /**
   * 設定読み込み
   */
  loadSettings: async () => {
    const settings = await localStorage.getSettings();
    set({ settings });
  },

  /**
   * 設定更新
   */
  updateSettings: async (updates: Partial<UserSettings>) => {
    await localStorage.saveSettings(updates);
    const settings = await localStorage.getSettings();
    set({ settings });
  },

  /**
   * 1日の累計読み込み
   */
  loadDailyTotal: async () => {
    const dailyTotal = await localStorage.getDailyTotal();
    set({ dailyTotal });
  },

  /**
   * リセット
   */
  reset: () => {
    set({
      appState: 'idle',
      currentSession: null,
      elapsedSeconds: 0,
      isRecording: false,
    });
  },
}));
