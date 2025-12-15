/**
 * MUEDnote Session Store (Zustand)
 * セッション状態管理
 */

import { create } from 'zustand';
import { localStorage, UserSettings } from '../cache/storage';
import { LocalSession, LocalLog } from '../api/types';

// VADステータス
type VadStatus = 'silence' | 'speech_start' | 'speech_continue' | 'speech_end';

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

  // 音声認識状態
  vadStatus: VadStatus;
  isWhisperReady: boolean;

  // リアルタイムログ（UI表示用）
  recentLogs: LocalLog[];

  // 設定
  settings: UserSettings;

  // アクション
  initialize: () => Promise<void>;
  startSession: (durationSec: number) => Promise<LocalSession>;
  endSession: (memo?: string) => Promise<LocalSession | null>;
  cancelSession: () => Promise<void>;
  addLog: (log: Omit<LocalLog, 'id' | 'created_at'>) => Promise<LocalLog>;
  deleteLog: (logId: string) => Promise<void>;
  tick: () => void;
  setVadStatus: (status: VadStatus) => void;
  setWhisperReady: (ready: boolean) => void;
  setRecording: (recording: boolean) => void;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
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
  vadStatus: 'silence',
  isWhisperReady: false,
  recentLogs: [],
  settings: {
    defaultDuration: 3600,
    enableVAD: true,
    autoSync: true,
  },

  /**
   * 初期化
   */
  initialize: async () => {
    try {
      // 設定読み込み
      const settings = await localStorage.getSettings();

      // アクティブセッションがあれば復元
      const activeSession = await localStorage.getCurrentSession();

      set({
        isInitialized: true,
        initError: null,
        settings,
        currentSession: activeSession,
        recentLogs: activeSession?.logs || [],
        appState: activeSession ? 'recording' : 'idle',
        elapsedSeconds: activeSession
          ? Math.floor(
              (Date.now() - new Date(activeSession.started_at).getTime()) / 1000
            )
          : 0,
      });

      console.log('[Store] Initialized', { hasActiveSession: !!activeSession });
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
  startSession: async (durationSec: number) => {
    const session = await localStorage.createSession(durationSec);

    set({
      currentSession: session,
      elapsedSeconds: 0,
      recentLogs: [],
      appState: 'recording',
      isRecording: true,
      vadStatus: 'silence',
    });

    console.log('[Store] Session started:', session.id);
    return session;
  },

  /**
   * セッション終了
   */
  endSession: async (memo?: string) => {
    const { currentSession } = get();
    if (!currentSession) return null;

    const session = await localStorage.endSession(currentSession.id, memo);

    set({
      currentSession: null,
      appState: 'reviewing',
      isRecording: false,
      vadStatus: 'silence',
    });

    console.log('[Store] Session ended:', currentSession.id);
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
      recentLogs: [],
      appState: 'idle',
      isRecording: false,
      vadStatus: 'silence',
    });

    console.log('[Store] Session cancelled:', currentSession.id);
  },

  /**
   * ログ追加
   */
  addLog: async (log) => {
    const { currentSession, recentLogs } = get();
    if (!currentSession) throw new Error('No active session');

    const newLog = await localStorage.addLog(currentSession.id, log);

    // 直近50件のみ保持
    const updatedLogs = [...recentLogs, newLog].slice(-50);

    set({ recentLogs: updatedLogs });

    return newLog;
  },

  /**
   * ログ削除
   */
  deleteLog: async (logId: string) => {
    const { currentSession, recentLogs } = get();
    if (!currentSession) return;

    await localStorage.deleteLog(currentSession.id, logId);

    set({
      recentLogs: recentLogs.filter((l) => l.id !== logId),
    });
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
      // 自動終了（外部からendSessionを呼ぶ）
      console.log('[Store] Timer ended');
    }

    set({ elapsedSeconds: newElapsed });
  },

  /**
   * VADステータス設定
   */
  setVadStatus: (status: VadStatus) => {
    set({ vadStatus: status });
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
   * リセット
   */
  reset: () => {
    set({
      appState: 'idle',
      currentSession: null,
      elapsedSeconds: 0,
      recentLogs: [],
      isRecording: false,
      vadStatus: 'silence',
    });
  },
}));
