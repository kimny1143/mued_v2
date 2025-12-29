/**
 * MUEDnote Local Storage
 * AsyncStorage を使用したオフラインキャッシュ
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalSession, LocalLog, FocusModeId } from '../api/types';

/**
 * 既存セッションのマイグレーション
 * modeフィールドがない場合は'standard'を設定
 */
function migrateSession(session: LocalSession): LocalSession {
  if (!session.mode) {
    return { ...session, mode: 'standard' };
  }
  return session;
}

/**
 * セッション配列のマイグレーション
 */
function migrateSessions(sessions: LocalSession[]): LocalSession[] {
  return sessions.map(migrateSession);
}

// Storage Keys
const KEYS = {
  CURRENT_SESSION: 'muednote:current_session',
  SESSIONS: 'muednote:sessions',
  SETTINGS: 'muednote:settings',
  ONBOARDING: 'muednote:onboarding_complete',
  HOO_SETTINGS: 'muednote:hoo_settings',
  DAILY_TOTAL: 'muednote:daily_total',
};

// 1日の累計記録
export interface DailyTotal {
  date: string; // YYYY-MM-DD形式
  totalSeconds: number;
  sessionCount: number;
}

// ユーザー設定
export interface UserSettings {
  defaultDuration: number;
  customDuration: number; // カスタムモードの時間（秒）
  enableVAD: boolean;
  autoSync: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  defaultDuration: 3600, // 60分
  customDuration: 45 * 60, // 45分
  enableVAD: true,
  autoSync: true,
};

// Hoo アニメーション設定
export interface HooSettings {
  // 強拍（大きな音）
  strongThreshold: number;  // 閾値 (0-1)
  strongDelta: number;      // 変化量閾値 (0-1)
  strongBounce: number;     // バウンス量 (px, 負の値)
  strongAttack: number;     // アタック時間 (ms)
  strongRelease: number;    // リリース時間 (ms)
  // 弱拍（中くらいの音）
  mediumThreshold: number;
  mediumDelta: number;
  mediumBounce: number;
  mediumAttack: number;
  mediumRelease: number;
}

export const DEFAULT_HOO_SETTINGS: HooSettings = {
  // 強拍
  strongThreshold: 0.25,
  strongDelta: 0.06,
  strongBounce: -5,      // 1.05倍（控えめ）
  strongAttack: 80,      // ゆっくりめ
  strongRelease: 120,    // ふわっと戻る
  // 弱拍
  mediumThreshold: 0.15,
  mediumDelta: 0.04,
  mediumBounce: -3,      // 1.03倍
  mediumAttack: 80,
  mediumRelease: 120,
};

class LocalStorage {
  // ========================================
  // Session Management
  // ========================================

  /**
   * 新規セッション作成
   */
  async createSession(durationSec: number, mode: FocusModeId = 'standard'): Promise<LocalSession> {
    const session: LocalSession = {
      id: `session_${Date.now()}`,
      duration_sec: durationSec,
      started_at: new Date().toISOString(),
      status: 'active',
      logs: [],
      mode,
    };

    await AsyncStorage.setItem(KEYS.CURRENT_SESSION, JSON.stringify(session));
    return session;
  }

  /**
   * 現在のセッション取得
   */
  async getCurrentSession(): Promise<LocalSession | null> {
    const data = await AsyncStorage.getItem(KEYS.CURRENT_SESSION);
    if (!data) return null;
    // マイグレーション: modeがなければ'standard'を設定
    return migrateSession(JSON.parse(data));
  }

  /**
   * セッション更新
   */
  async updateSession(session: LocalSession): Promise<void> {
    await AsyncStorage.setItem(KEYS.CURRENT_SESSION, JSON.stringify(session));
  }

  /**
   * セッション終了
   */
  async endSession(
    sessionId: string,
    memo?: string,
    audioFilePath?: string
  ): Promise<LocalSession | null> {
    const session = await this.getCurrentSession();
    if (!session || session.id !== sessionId) return null;

    session.status = 'completed';
    session.ended_at = new Date().toISOString();
    if (memo) session.memo = memo;
    if (audioFilePath) session.audioFilePath = audioFilePath;

    // 完了済みセッションリストに追加
    const sessions = await this.getAllSessions();
    sessions.unshift(session);
    await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));

    // 現在のセッションをクリア
    await AsyncStorage.removeItem(KEYS.CURRENT_SESSION);

    return session;
  }

  /**
   * セッション削除（キャンセル）
   */
  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.getCurrentSession();
    if (session?.id === sessionId) {
      await AsyncStorage.removeItem(KEYS.CURRENT_SESSION);
    }
  }

  /**
   * 全セッション取得
   */
  async getAllSessions(): Promise<LocalSession[]> {
    const data = await AsyncStorage.getItem(KEYS.SESSIONS);
    if (!data) return [];
    // マイグレーション: 既存セッションにmodeがなければ'standard'を設定
    return migrateSessions(JSON.parse(data));
  }

  /**
   * 同期待ちセッション取得
   */
  async getPendingSessions(): Promise<LocalSession[]> {
    const sessions = await this.getAllSessions();
    return sessions.filter((s) => s.status === 'completed');
  }

  /**
   * セッションを同期済みにマーク
   */
  async markSessionSynced(sessionId: string): Promise<void> {
    const sessions = await this.getAllSessions();
    const index = sessions.findIndex((s) => s.id === sessionId);
    if (index !== -1) {
      sessions[index].status = 'synced';
      await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
    }
  }

  /**
   * セッションのメモを更新
   */
  async updateSessionMemo(sessionId: string, memo: string): Promise<void> {
    const sessions = await this.getAllSessions();
    const index = sessions.findIndex((s) => s.id === sessionId);
    if (index !== -1) {
      sessions[index].memo = memo;
      await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
    }
  }

  /**
   * セッションの音声ファイルパスを更新
   */
  async updateSessionAudioPath(sessionId: string, audioFilePath: string): Promise<void> {
    const sessions = await this.getAllSessions();
    const index = sessions.findIndex((s) => s.id === sessionId);
    if (index !== -1) {
      sessions[index].audioFilePath = audioFilePath;
      await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
    }
  }

  /**
   * セッション削除（完了済みセッションリストから）
   */
  async removeSession(sessionId: string): Promise<void> {
    const sessions = await this.getAllSessions();
    const filtered = sessions.filter((s) => s.id !== sessionId);
    await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(filtered));
  }

  // ========================================
  // Log Management
  // ========================================

  /**
   * ログ追加（アクティブまたは完了済みセッションに対応）
   */
  async addLog(
    sessionId: string,
    log: Omit<LocalLog, 'id' | 'created_at'>
  ): Promise<LocalLog> {
    const newLog: LocalLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      created_at: new Date().toISOString(),
    };

    // まずアクティブセッションをチェック
    const currentSession = await this.getCurrentSession();
    if (currentSession && currentSession.id === sessionId) {
      currentSession.logs.push(newLog);
      await this.updateSession(currentSession);
      return newLog;
    }

    // 完了済みセッションリストをチェック
    const sessions = await this.getAllSessions();
    const index = sessions.findIndex((s) => s.id === sessionId);
    if (index !== -1) {
      sessions[index].logs.push(newLog);
      await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
      return newLog;
    }

    throw new Error('Session not found');
  }

  /**
   * ログ削除（アクティブまたは完了済みセッションに対応）
   */
  async deleteLog(sessionId: string, logId: string): Promise<void> {
    // まずアクティブセッションをチェック
    const currentSession = await this.getCurrentSession();
    if (currentSession && currentSession.id === sessionId) {
      currentSession.logs = currentSession.logs.filter((l) => l.id !== logId);
      await this.updateSession(currentSession);
      return;
    }

    // 完了済みセッションリストをチェック
    const sessions = await this.getAllSessions();
    const index = sessions.findIndex((s) => s.id === sessionId);
    if (index !== -1) {
      sessions[index].logs = sessions[index].logs.filter((l) => l.id !== logId);
      await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
    }
  }

  // ========================================
  // Settings
  // ========================================

  /**
   * 設定取得
   */
  async getSettings(): Promise<UserSettings> {
    const data = await AsyncStorage.getItem(KEYS.SETTINGS);
    if (!data) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  }

  /**
   * 設定保存
   */
  async saveSettings(settings: Partial<UserSettings>): Promise<void> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(updated));
  }

  // ========================================
  // Hoo Settings
  // ========================================

  /**
   * Hoo設定取得
   */
  async getHooSettings(): Promise<HooSettings> {
    const data = await AsyncStorage.getItem(KEYS.HOO_SETTINGS);
    if (!data) return DEFAULT_HOO_SETTINGS;
    return { ...DEFAULT_HOO_SETTINGS, ...JSON.parse(data) };
  }

  /**
   * Hoo設定保存
   */
  async saveHooSettings(settings: Partial<HooSettings>): Promise<void> {
    const current = await this.getHooSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(KEYS.HOO_SETTINGS, JSON.stringify(updated));
  }

  /**
   * Hoo設定リセット
   */
  async resetHooSettings(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.HOO_SETTINGS);
  }

  // ========================================
  // Onboarding
  // ========================================

  /**
   * オンボーディング完了状態取得
   */
  async isOnboardingComplete(): Promise<boolean> {
    const data = await AsyncStorage.getItem(KEYS.ONBOARDING);
    return data === 'true';
  }

  /**
   * オンボーディング完了設定
   */
  async setOnboardingComplete(): Promise<void> {
    await AsyncStorage.setItem(KEYS.ONBOARDING, 'true');
  }

  // ========================================
  // Daily Total Tracking
  // ========================================

  /**
   * 今日の日付を取得（YYYY-MM-DD形式）
   */
  private getTodayDate(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  /**
   * 1日の累計取得（日付が変わっていたらリセット）
   */
  async getDailyTotal(): Promise<DailyTotal> {
    const today = this.getTodayDate();
    const data = await AsyncStorage.getItem(KEYS.DAILY_TOTAL);

    if (!data) {
      return { date: today, totalSeconds: 0, sessionCount: 0 };
    }

    const stored: DailyTotal = JSON.parse(data);

    // 日付が変わっていたらリセット
    if (stored.date !== today) {
      const newTotal = { date: today, totalSeconds: 0, sessionCount: 0 };
      await AsyncStorage.setItem(KEYS.DAILY_TOTAL, JSON.stringify(newTotal));
      return newTotal;
    }

    return stored;
  }

  /**
   * セッション完了時に累計を更新
   */
  async addToDailyTotal(durationSeconds: number): Promise<DailyTotal> {
    const current = await this.getDailyTotal();
    const updated: DailyTotal = {
      date: current.date,
      totalSeconds: current.totalSeconds + durationSeconds,
      sessionCount: current.sessionCount + 1,
    };
    await AsyncStorage.setItem(KEYS.DAILY_TOTAL, JSON.stringify(updated));
    return updated;
  }

  /**
   * 4時間超過チェック
   */
  async isOverDailyLimit(): Promise<boolean> {
    const { totalSeconds } = await this.getDailyTotal();
    return totalSeconds >= 4 * 60 * 60; // 4時間
  }

  // ========================================
  // Debug / Maintenance
  // ========================================

  /**
   * 全データクリア
   */
  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([
      KEYS.CURRENT_SESSION,
      KEYS.SESSIONS,
      KEYS.SETTINGS,
      KEYS.ONBOARDING,
      KEYS.HOO_SETTINGS,
      KEYS.DAILY_TOTAL,
    ]);
  }
}

// シングルトンエクスポート
export const localStorage = new LocalStorage();
