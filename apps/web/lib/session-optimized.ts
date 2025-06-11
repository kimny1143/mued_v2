/**
 * 最適化されたセッション管理
 * キャッシュとバッチ処理により高速化
 */
import { prisma } from './prisma';
import { createClient } from './supabase-server';
import { 
  getCachedSession, 
  setCachedSession, 
  getCachedJWT, 
  setCachedJWT,
  type CachedSession 
} from './cache/session-cache';
import { 
  extractTokenFast, 
  generateCacheKey, 
  decodeJWTPayload,
  isTokenExpired 
} from './jwt-utils';

// フィーチャーフラグ：最適化版を使用するか
const USE_OPTIMIZED_SESSION = process.env.NEXT_PUBLIC_USE_OPTIMIZED_SESSION === 'true';

/**
 * 最適化されたセッション取得関数
 * キャッシュを活用してDBアクセスを最小限に
 */
export async function getSessionFromRequestOptimized(request: Request) {
  try {
    // 1. トークンの高速抽出
    const token = extractTokenFast(request);
    if (!token) {
      console.log('[Session] No token found');
      return null;
    }

    // 2. トークンの有効期限を事前チェック（DBアクセス前）
    if (isTokenExpired(token)) {
      console.log('[Session] Token expired');
      return null;
    }

    // 3. セッションキャッシュのチェック
    const cacheKey = generateCacheKey(token);
    const cachedSession = getCachedSession(cacheKey);
    
    if (cachedSession) {
      console.log('[Session] Cache hit');
      return {
        user: { 
          id: cachedSession.userId, 
          email: cachedSession.email,
          name: cachedSession.name 
        },
        role: cachedSession.role,
        cached: true, // デバッグ用フラグ
        _cacheHit: true // APIレスポンスヘッダー用
      };
    }

    console.log('[Session] Cache miss, verifying token');

    // 4. JWT検証（キャッシュチェック付き）
    const decodedJWT = await verifyJWTWithCache(token);
    if (!decodedJWT) {
      console.log('[Session] Token verification failed');
      return null;
    }

    // 5. ユーザー情報の取得（最小限のフィールド）
    const user = await getUserMinimal(decodedJWT.sub);
    if (!user) {
      console.log('[Session] User not found');
      return null;
    }

    // 6. ロール情報の取得
    const role = await getUserRole(user.id);

    // 7. キャッシュに保存
    const sessionData: CachedSession = {
      userId: user.id,
      email: user.email || '',
      name: user.name || undefined,
      role: role || 'student',
      expiresAt: decodedJWT.exp * 1000
    };
    setCachedSession(cacheKey, sessionData);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      role: sessionData.role,
      cached: false
    };
  } catch (error) {
    console.error('[Session] Error:', error);
    return null;
  }
}

/**
 * JWTの検証（キャッシュ付き）
 */
async function verifyJWTWithCache(token: string): Promise<any | null> {
  // キャッシュチェック
  const cached = getCachedJWT(token);
  if (cached) {
    return cached;
  }

  // Supabaseクライアントで検証
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return null;
  }

  // JWTペイロードをデコードしてキャッシュ
  const payload = decodeJWTPayload(token);
  if (payload) {
    setCachedJWT(token, payload);
  }

  return payload;
}

/**
 * ユーザー情報を最小限のフィールドで取得
 */
async function getUserMinimal(userId: string) {
  return await prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role_id: true
    }
  });
}

/**
 * ユーザーのロールを取得
 */
async function getUserRole(userId: string): Promise<string | null> {
  const userWithRole = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      roles: {
        select: { name: true }
      }
    }
  });

  console.log('[getUserRole] User:', userId, 'Role:', userWithRole?.roles?.name);
  return userWithRole?.roles?.name || null;
}

/**
 * フィーチャーフラグに基づいてセッション取得関数を選択
 */
export async function getSessionFromRequest(request: Request) {
  if (USE_OPTIMIZED_SESSION) {
    const result = await getSessionFromRequestOptimized(request);
    // デバッグログ
    if (process.env.NODE_ENV === 'development' && result) {
      console.log(`[Session] Using optimized version (cached: ${result.cached})`);
    }
    return result;
  }
  
  // 従来の実装を使用
  const { getSessionFromRequest: originalFunction } = await import('./session');
  return originalFunction(request);
}

/**
 * セッションの手動更新（キャッシュをクリア）
 */
export function invalidateSession(token: string) {
  const cacheKey = generateCacheKey(token);
  const { sessionCache } = require('./cache/session-cache');
  sessionCache.delete(cacheKey);
}