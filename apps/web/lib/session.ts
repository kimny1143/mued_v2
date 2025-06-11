/**
 * セッション管理の基本実装
 * Supabase Authを使用したセッション取得
 */
import { createClient } from './supabase-server';
import { prisma } from './prisma';

/**
 * リクエストからセッション情報を取得
 * @param request HTTP Request オブジェクト
 * @returns セッション情報またはnull
 */
export async function getSessionFromRequest(request: Request) {
  try {
    // Supabaseクライアントを作成
    const supabase = createClient();
    
    // Cookieヘッダーを取得
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) {
      console.log('[Session] No cookie header');
      return null;
    }

    // Authorizationヘッダーをチェック
    const authHeader = request.headers.get('Authorization');
    
    // Supabaseセッションを取得
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.log('[Session] No session found:', error?.message);
      return null;
    }

    // ユーザー情報を取得
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role_id: true,
        roles: {
          select: { name: true }
        }
      }
    });

    if (!user) {
      console.log('[Session] User not found in database');
      return null;
    }

    return {
      user: {
        id: user.id,
        email: user.email || session.user.email,
        name: user.name
      },
      role: user.roles?.name || 'student'
    };
  } catch (error) {
    console.error('[Session] Error:', error);
    return null;
  }
}

/**
 * Cookieからセッション情報を取得（レガシー）
 * @param cookie Cookie文字列
 * @returns セッション情報またはnull
 */
export async function getSessionFromCookie(cookie: string) {
  try {
    const supabase = createClient();
    
    // リクエストオブジェクトを擬似的に作成
    const request = new Request('http://localhost', {
      headers: { cookie }
    });
    
    return getSessionFromRequest(request);
  } catch (error) {
    console.error('[Session] Cookie error:', error);
    return null;
  }
}

/**
 * セッションからユーザー情報を取得
 * @param session セッションオブジェクト
 * @returns ユーザー情報
 */
export function getUserFromSession(session: any) {
  if (!session?.user) return null;
  
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.role || 'student'
  };
}

// フィーチャーフラグで最適化版に切り替え可能
const USE_OPTIMIZED = process.env.NEXT_PUBLIC_USE_OPTIMIZED_SESSION === 'true';

if (USE_OPTIMIZED) {
  console.log('[Session] Optimized session management enabled');
  // 最適化版を動的インポート
  import('./session-optimized').then(module => {
    // エクスポートを上書き
    Object.assign(exports, {
      getSessionFromRequest: module.getSessionFromRequest
    });
  });
}