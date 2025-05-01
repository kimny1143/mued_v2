import { openDB, IDBPDatabase } from 'idb';

// ExerciseLogの型定義
export interface OfflineExerciseLog {
  id: string;
  user_id: string;
  instrument: string;
  duration_minutes: number;
  difficulty: string;
  notes?: string;
  mood?: string;
  date: string;
  created_at: string;
  synced: boolean;
}

// データベース初期化
const dbPromise = openDB('mued-offline-db', 1, {
  upgrade(db) {
    // 練習ログのオブジェクトストアを作成
    if (!db.objectStoreNames.contains('exercise_logs')) {
      const ExerciseLogsStore = db.createObjectStore('exercise_logs', { keyPath: 'id' });
      // syncedフィールドにインデックスを作成
      ExerciseLogsStore.createIndex('by-synced', 'synced');
    }
  },
});

// 練習ログ関連の操作
export const offlineExerciseLogs = {
  // 練習ログを保存
  async saveExerciseLog(log: OfflineExerciseLog): Promise<string> {
    const db = await dbPromise;
    await db.put('exercise_logs', log);
    return log.id;
  },

  // 未同期の練習ログを取得
  async getUnsyncedLogs(): Promise<OfflineExerciseLog[]> {
    const db = await dbPromise;
    return db.getAllFromIndex('exercise_logs', 'by-synced', 0) as Promise<OfflineExerciseLog[]>;
  },

  // 練習ログを同期済みとしてマーク
  async markAsSynced(id: string): Promise<void> {
    const db = await dbPromise;
    const tx = db.transaction('exercise_logs', 'readwrite');
    const log = await tx.store.get(id);
    if (log) {
      log.synced = true;
      await tx.store.put(log);
    }
    await tx.done;
  },

  // すべての練習ログを取得
  async getAllLogs(): Promise<OfflineExerciseLog[]> {
    const db = await dbPromise;
    return db.getAll('exercise_logs');
  },

  // 特定の練習ログを取得
  async getLogById(id: string): Promise<OfflineExerciseLog | undefined> {
    const db = await dbPromise;
    return db.get('exercise_logs', id);
  },
};

// ネットワーク状態の監視
export function useNetworkStatus() {
  return {
    isOnline: navigator.onLine,
    addOnlineListener: (callback: () => void) => {
      window.addEventListener('online', callback);
      return () => window.removeEventListener('online', callback);
    },
    addOfflineListener: (callback: () => void) => {
      window.addEventListener('offline', callback);
      return () => window.removeEventListener('offline', callback);
    },
  };
}

// バックグラウンド同期処理（オプション）
export async function syncExerciseLogs(apiClient: any) {
  const unsyncedLogs = await offlineExerciseLogs.getUnsyncedLogs();
  
  for (const log of unsyncedLogs) {
    try {
      // ネットワークが利用可能な場合のみ同期
      if (navigator.onLine) {
        // APIクライアントを使用してサーバーに送信
        const { id, user_id, instrument, duration_minutes, difficulty, notes, mood, date } = log;
        await apiClient.post('/exercise/logs', {
          user_id, instrument, duration_minutes, difficulty, notes, mood, date
        });
        
        // 成功したら同期済みとしてマーク
        await offlineExerciseLogs.markAsSynced(id);
      }
    } catch (error) {
      console.error('Failed to sync practice log:', error);
      // エラーハンドリング（必要に応じて再試行ロジックを追加）
    }
  }
} 