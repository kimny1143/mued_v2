/**
 * MUEDnote Sync Service
 * ローカルセッションとサーバーの同期を管理
 */

import { apiClient } from '../api/client';
import { localStorage } from '../cache/storage';
import { LocalSession } from '../api/types';

export interface SyncResult {
  sessionId: string;
  success: boolean;
  savedLogs: number;
  error?: string;
}

export interface BatchSyncResult {
  total: number;
  success: number;
  failed: number;
  results: SyncResult[];
}

class SyncService {
  private isSyncing = false;

  /**
   * 単一セッションをサーバーに同期
   */
  async syncSession(session: LocalSession): Promise<SyncResult> {
    try {
      // セッション時間を計算
      const start = new Date(session.started_at);
      const end = session.ended_at ? new Date(session.ended_at) : new Date();
      const durationSec = Math.floor((end.getTime() - start.getTime()) / 1000);

      // ログをサーバー形式に変換
      const logsToSync = session.logs.map((log) => ({
        timestamp_sec: log.timestamp_sec,
        text: log.text,
        confidence: log.confidence,
      }));

      // サーバーに同期
      const result = await apiClient.syncSession(
        {
          duration_sec: durationSec,
          started_at: session.started_at,
          ended_at: session.ended_at || new Date().toISOString(),
          session_memo: session.memo,
        },
        logsToSync
      );

      // ローカルを同期済みにマーク
      await localStorage.markSessionSynced(session.id);

      return {
        sessionId: session.id,
        success: true,
        savedLogs: result.savedLogs,
      };
    } catch (error) {
      console.error('[SyncService] Failed to sync session:', session.id, error);
      return {
        sessionId: session.id,
        success: false,
        savedLogs: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 全ての保留中セッションをバッチ同期
   */
  async syncAllPending(): Promise<BatchSyncResult> {
    if (this.isSyncing) {
      return {
        total: 0,
        success: 0,
        failed: 0,
        results: [],
      };
    }

    this.isSyncing = true;

    try {
      const pendingSessions = await localStorage.getPendingSessions();

      if (pendingSessions.length === 0) {
        return {
          total: 0,
          success: 0,
          failed: 0,
          results: [],
        };
      }

      const results: SyncResult[] = [];

      // 順番に同期（並列だとサーバー負荷が高い場合がある）
      for (const session of pendingSessions) {
        const result = await this.syncSession(session);
        results.push(result);
      }

      const successCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;

      return {
        total: pendingSessions.length,
        success: successCount,
        failed: failedCount,
        results,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * 同期中かどうか
   */
  get syncing(): boolean {
    return this.isSyncing;
  }
}

// シングルトンエクスポート
export const syncService = new SyncService();
