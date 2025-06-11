/**
 * セッション情報のインメモリキャッシュ
 * LRU (Least Recently Used) アルゴリズムで管理
 */
import { LRUCache } from 'lru-cache';

// キャッシュされるセッション情報の型
export interface CachedSession {
  userId: string;
  email: string;
  role: string;
  name?: string;
  expiresAt: number;
}

// JWT検証結果の型
export interface CachedJWT {
  sub: string;
  email?: string;
  exp: number;
  iat: number;
}

// セッション情報のキャッシュ設定
const SESSION_CACHE_OPTIONS = {
  max: 1000,              // 最大1000エントリ
  ttl: 1000 * 60 * 5,     // 5分間のTTL
  updateAgeOnGet: true,   // アクセス時にTTLをリセット
  updateAgeOnHas: true,   // 存在確認時にTTLをリセット
};

// JWT検証結果のキャッシュ設定
const JWT_CACHE_OPTIONS = {
  max: 500,               // 最大500エントリ
  ttl: 1000 * 60 * 60,    // 1時間のTTL（通常のJWT有効期限）
  updateAgeOnGet: false,  // JWTは有効期限固定なのでリセットしない
};

// キャッシュインスタンス
export const sessionCache = new LRUCache<string, CachedSession>(SESSION_CACHE_OPTIONS);
export const jwtCache = new LRUCache<string, CachedJWT>(JWT_CACHE_OPTIONS);

// デバッグ用：キャッシュ統計情報
let cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
};

/**
 * キャッシュからセッションを取得
 */
export function getCachedSession(key: string): CachedSession | null {
  const cached = sessionCache.get(key);
  if (cached) {
    // 有効期限チェック
    if (cached.expiresAt > Date.now()) {
      cacheStats.hits++;
      return cached;
    }
    // 期限切れの場合は削除
    sessionCache.delete(key);
    cacheStats.deletes++;
  }
  cacheStats.misses++;
  return null;
}

/**
 * セッションをキャッシュに保存
 */
export function setCachedSession(key: string, session: CachedSession): void {
  sessionCache.set(key, session);
  cacheStats.sets++;
}

/**
 * キャッシュからJWT検証結果を取得
 */
export function getCachedJWT(token: string): CachedJWT | null {
  const cached = jwtCache.get(token);
  if (cached) {
    // 有効期限チェック
    const now = Math.floor(Date.now() / 1000);
    if (cached.exp > now) {
      return cached;
    }
    // 期限切れの場合は削除
    jwtCache.delete(token);
  }
  return null;
}

/**
 * JWT検証結果をキャッシュに保存
 */
export function setCachedJWT(token: string, decoded: CachedJWT): void {
  jwtCache.set(token, decoded);
}

/**
 * 特定ユーザーのセッションを全て無効化
 */
export function invalidateUserSessions(userId: string): void {
  // キャッシュ内の全エントリをチェック
  for (const [key, session] of sessionCache.entries()) {
    if (session.userId === userId) {
      sessionCache.delete(key);
      cacheStats.deletes++;
    }
  }
}

/**
 * キャッシュをクリア
 */
export function clearAllCaches(): void {
  sessionCache.clear();
  jwtCache.clear();
  cacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };
}

/**
 * キャッシュ統計情報を取得（デバッグ用）
 */
export function getCacheStats() {
  const hitRate = cacheStats.hits / (cacheStats.hits + cacheStats.misses) || 0;
  return {
    ...cacheStats,
    hitRate: `${(hitRate * 100).toFixed(2)}%`,
    sessionCacheSize: sessionCache.size,
    jwtCacheSize: jwtCache.size,
  };
}

// 開発環境でのみキャッシュ統計を定期的にログ出力
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const stats = getCacheStats();
    if (stats.hits + stats.misses > 0) {
      console.log('[Cache Stats]', stats);
    }
  }, 60000); // 1分ごと
}