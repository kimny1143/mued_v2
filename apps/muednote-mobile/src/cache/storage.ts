/**
 * MUEDnote Local Storage
 * AsyncStorage を使用したオフラインキャッシュ
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalSession, LocalLog } from '../api/types';

// Storage Keys
const KEYS = {
  CURRENT_SESSION: 'muednote:current_session',
  SESSIONS: 'muednote:sessions',
  SETTINGS: 'muednote:settings',
  ONBOARDING: 'muednote:onboarding_complete',
};

// ユーザー設定
export interface UserSettings {
  defaultDuration: number;
  enableVAD: boolean;
  autoSync: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  defaultDuration: 3600, // 60分
  enableVAD: true,
  autoSync: true,
};

class LocalStorage {
  // ========================================
  // Session Management
  // ========================================

  /**
   * 新規セッション作成
   */
  async createSession(durationSec: number): Promise<LocalSession> {
    const session: LocalSession = {
      id: `session_${Date.now()}`,
      duration_sec: durationSec,
      started_at: new Date().toISOString(),
      status: 'active',
      logs: [],
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
    return JSON.parse(data);
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
  async endSession(sessionId: string, memo?: string): Promise<LocalSession | null> {
    const session = await this.getCurrentSession();
    if (!session || session.id !== sessionId) return null;

    session.status = 'completed';
    session.ended_at = new Date().toISOString();
    if (memo) session.memo = memo;

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
    return JSON.parse(data);
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

  // ========================================
  // Log Management
  // ========================================

  /**
   * ログ追加
   */
  async addLog(
    sessionId: string,
    log: Omit<LocalLog, 'id' | 'created_at'>
  ): Promise<LocalLog> {
    const session = await this.getCurrentSession();
    if (!session || session.id !== sessionId) {
      throw new Error('Session not found');
    }

    const newLog: LocalLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      created_at: new Date().toISOString(),
    };

    session.logs.push(newLog);
    await this.updateSession(session);

    return newLog;
  }

  /**
   * ログ削除
   */
  async deleteLog(sessionId: string, logId: string): Promise<void> {
    const session = await this.getCurrentSession();
    if (!session || session.id !== sessionId) return;

    session.logs = session.logs.filter((l) => l.id !== logId);
    await this.updateSession(session);
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
    ]);
  }
}

// シングルトンエクスポート
export const localStorage = new LocalStorage();
