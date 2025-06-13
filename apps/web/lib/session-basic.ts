/**
 * セッション管理の基本実装
 * Supabase Authを使用したセッション取得
 */
import { createClient } from './supabase/server';
import { prisma } from './prisma';

/**
 * リクエストからセッション情報を取得
 * @param request HTTP Request オブジェクト
 * @returns セッション情報またはnull
 */
export async function getSessionFromRequest(request: Request) {
  try {
    // Supabaseクライアントを作成
    const supabase = await createClient();
    
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

    const roleName = user.roles?.name || 'student';
    console.log('[Session] User:', user.email, 'Role:', roleName, 'Role ID:', user.role_id);

    return {
      user: {
        id: user.id,
        email: user.email || session.user.email,
        name: user.name
      },
      role: roleName
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

