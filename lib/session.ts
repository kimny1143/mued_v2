import { supabaseServer } from './supabase-server';
import { createClient } from '@supabase/supabase-js';
import type { Session, User } from '@supabase/supabase-js';
import { prisma } from './prisma'; // Prismaクライアントをインポート

// 一般的なロール定義（固定値）
const ROLE_NAMES = {
  STUDENT: 'student',
  MENTOR: 'mentor',
  ADMIN: 'admin'
};

// roleIdからロール名を決定する関数
async function getRoleNameById(roleId: string): Promise<string | undefined> {
  try {
    // UUIDとして有効なroleIdか判断
    const isUuid = roleId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    
    // UUIDならDBから名前を取得
    if (isUuid) {
      try {
        const role = await prisma.roles.findUnique({
          where: { id: roleId }
        });
        
        if (role?.name) {
          return role.name.toLowerCase();
        }
      } catch (dbError) {
        console.error('ロール取得DBエラー:', dbError);
        // DBエラーの場合はフォールバックとして文字列判定に進む
      }
    }
    
    // 文字列IDとして判定（ゆるやかに）
    const roleLower = roleId.toLowerCase();
    
    if (roleLower.includes('admin')) {
      return ROLE_NAMES.ADMIN;
    }
    if (roleLower.includes('mentor')) {
      return ROLE_NAMES.MENTOR;
    }
    if (roleLower.includes('student')) {
      return ROLE_NAMES.STUDENT;
    }
    
    return undefined;
  } catch (e) {
    console.error('ロール名取得エラー:', e);
    return undefined;
  }
}

// ロール名を安全に抽出する関数（改善版）
function extractRoleName(roleData: unknown): string | undefined {
  try {
    if (!roleData) return undefined;
    
    // 文字列の場合はそのまま返す
    if (typeof roleData === 'string') {
      return roleData.toLowerCase();
    }
    
    // オブジェクトの場合は直接nameプロパティにアクセス
    if (typeof roleData === 'object' && roleData !== null && !Array.isArray(roleData) && 'name' in roleData) {
      const name = (roleData as Record<string, unknown>).name;
      return typeof name === 'string' ? name.toLowerCase() : undefined;
    }
    
    // 配列の場合の処理
    if (Array.isArray(roleData) && roleData.length > 0) {
      // 配列の最初の要素が文字列の場合
      if (typeof roleData[0] === 'string') {
        return roleData[0].toLowerCase();
      }
      
      // 配列の最初の要素がオブジェクトでnameプロパティがある場合
      if (typeof roleData[0] === 'object' && roleData[0] !== null && 
          roleData[0] !== undefined && 'name' in roleData[0]) {
        const firstItem = roleData[0] as Record<string, unknown>;
        const name = firstItem.name;
        return typeof name === 'string' ? name.toLowerCase() : undefined;
      }
    }
    
    return undefined;
  } catch (e) {
    console.error('ロール名抽出エラー:', e);
    return undefined;
  }
}

/**
 * セッション情報を取得（サーバーサイド用）
 * @returns サーバーサイドでのセッション情報
 */
export async function getServerSession() {
  const { data, error } = await supabaseServer.auth.getSession();
  
  if (error) {
    console.error("サーバーセッション取得エラー:", error);
    return null;
  }
  
  if (!data.session) {
    console.log("サーバーセッションなし");
    return null;
  }
  
  return data.session;
}

/**
 * ユーザー情報と権限を取得（APIルート用）
 * @returns ユーザー情報と権限、または認証されていない場合はnull
 */
export async function getAuthenticatedUser(): Promise<{user: User, role: string} | null> {
  const { data: sessionData, error } = await supabaseServer.auth.getSession();
  
  if (error) {
    console.error("認証ユーザー取得エラー:", error);
    return null;
  }
  
  if (!sessionData?.session?.user) {
    console.log("認証されたユーザーなし");
    return null;
  }
  
  // ユーザー情報＋ロールをPrismaで取得（Supabase権限問題回避）
  console.log("getAuthenticatedUser - Prismaでユーザー情報取得開始:", sessionData.session.user.id);
  
  try {
    const userData = await prisma.users.findUnique({
      where: { id: sessionData.session.user.id },
      select: { role_id: true }
    });
    
    if (!userData) {
      console.error("getAuthenticatedUser - Prismaでユーザー情報が見つかりません:", sessionData.session.user.id);
      return null;
    }
    
    console.log("getAuthenticatedUser - Prismaユーザーデータ取得結果:", userData);
    
    // role_idから直接ロールを取得
    const finalRole = userData.role_id || 'student';
    
    console.log("getAuthenticatedUser - Prismaロール取得:", {
      roleId: userData.role_id,
      final: finalRole
    });
    
    return {
      user: sessionData.session.user,
      role: finalRole.toLowerCase()
    };
  } catch (prismaError) {
    console.error("getAuthenticatedUser - Prisma取得エラー:", prismaError);
    return null;
  }
}

/**
 * リクエストからセッション情報を取得（APIルート用）
 * @param request NextRequestオブジェクト
 * @returns ユーザー情報と権限、または認証されていない場合はnull
 */
export async function getSessionFromRequest(request: Request): Promise<{
  session: Session;
  user: User;
  role?: string;
} | null> {
  try {
    console.log("リクエストからセッション取得開始");
    console.log("環境:", process.env.NODE_ENV || "環境変数なし");
    console.log("Supabaseサービス URL:", 
      process.env.NEXT_PUBLIC_SUPABASE_URL ? 
      `設定済み (${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20)}...)` : 
      "未設定");
    
    // サーバー側のSupabase設定を確認
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseAnonKey) {
      console.error("Supabase匿名キーが設定されていません");
    } else {
      console.log("Supabase匿名キー設定状態:", "設定済み");
    }
    
    // ヘッダーから認証トークンを取得
    const authHeader = request.headers.get('Authorization');
    let token: string | null = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log("Authorizationヘッダーからトークン検出:", 
        token ? `有効なトークン (${token.substring(0, 10)}...)` : "空のトークン");
    }
    
    // Authorization ヘッダーが無ければ Cookie から取得（sb-auth-token）
    if (!token) {
      const cookieHeader = request.headers.get('cookie') || '';
      console.log("Cookie ヘッダー検索開始:", cookieHeader.substring(0, 100) + '...');
      
      // Supabase v2の実際のcookieキーパターンに対応
      // 1. sb-<projectRef>-auth-token.0 (base64パート)
      // 2. sb-<projectRef>-auth-token.1 (残りのパート)
      const authTokenMatch = cookieHeader.match(/sb-[^=]+-auth-token\.0=([^;]+)/);
      
      if (authTokenMatch && authTokenMatch[1]) {
        try {
          // Base64デコードしてJSONパース
          const decodedToken = decodeURIComponent(authTokenMatch[1]);
          console.log("Cookie から auth-token.0 取得:", decodedToken.substring(0, 20) + '...');
          
          // base64-でプレフィックスされている場合の処理
          let tokenData = decodedToken;
          if (tokenData.startsWith('base64-')) {
            tokenData = atob(tokenData.substring(7)); // base64-を除去してデコード
          }
          
          // JSONパースしてaccess_tokenを取得
          const tokenObject = JSON.parse(tokenData);
          if (tokenObject.access_token) {
            token = tokenObject.access_token;
            console.log("Cookie からアクセストークン解析成功:", token ? token.substring(0, 10) + '...' : 'null');
          } else {
            console.log("トークンオブジェクトにaccess_tokenが見つかりません:", Object.keys(tokenObject));
          }
        } catch (parseError) {
          console.error("Cookie トークン解析エラー:", parseError);
          
          // フォールバック: 古い形式も試行
          const legacyMatch = cookieHeader.match(/sb-(?:[^=]+-)?access-token=([^;]+)/);
          if (legacyMatch && legacyMatch[1]) {
            token = decodeURIComponent(legacyMatch[1]);
            console.log("フォールバック: レガシーaccess-token取得:", token ? token.substring(0, 10) + '...' : 'null');
          }
        }
      } else {
        console.log("Cookie に sb-*-auth-token.0 が見つかりませんでした");
        
        // 代替: access-tokenも検索
        const accessTokenMatch = cookieHeader.match(/sb-(?:[^=]+-)?access-token=([^;]+)/);
        if (accessTokenMatch && accessTokenMatch[1]) {
          token = decodeURIComponent(accessTokenMatch[1]);
          console.log("Cookie から代替access-token取得:", token ? token.substring(0, 10) + '...' : 'null');
        }
      }
    }
    
    if (!token) {
      console.log("有効なトークンがヘッダーにも Cookie にも見つかりませんでした");
    }
    
    // 1. Authorizationヘッダーがあればそこからトークンを使ってセッション検証
    if (token) {
      try {
        console.log(`トークン認証開始 (${token.substring(0, 10)}...)`);
        
        // トークンを使用してSupabaseでユーザー情報を取得
        const supabaseWithToken = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          }
        );
        
        const { data: userData, error: userError } = await supabaseWithToken.auth.getUser();
        
        if (userError) {
          console.error("トークンからユーザー取得エラー:", userError);
        } else if (userData?.user) {
          console.log("トークンからユーザー取得成功:", userData.user.email);
          
          // ユーザー情報＋ロールをPrismaで取得（Supabase権限問題回避）
          try {
            console.log("トークン認証 - Prismaでユーザー情報取得開始:", userData.user.id);
            
            const userDataFromPrisma = await prisma.users.findUnique({
              where: { id: userData.user.id },
              select: { role_id: true }
            });
              
            if (!userDataFromPrisma) {
              console.error("トークン認証 - Prismaでユーザー情報が見つかりません:", userData.user.id);
            }
            
            console.log("トークン認証 - Prismaユーザーデータ取得結果:", userDataFromPrisma);
            
            // ロール確認（role_idを使用）
            const rawRole = userDataFromPrisma?.role_id || 'student';
            const normalizedRole = typeof rawRole === 'string' ? 
              rawRole.trim().toLowerCase() : rawRole;
            
            console.log("トークン認証 - Prismaロール取得:", {
              roleId: userDataFromPrisma?.role_id,
              raw: rawRole,
              normalized: normalizedRole,
              type: typeof normalizedRole
            });
            
            // セッションオブジェクトを作成（トークンからは直接取得できないため）
            return {
              session: {
                access_token: token,
                refresh_token: '',
                expires_in: 3600,
                expires_at: 0,
                token_type: 'bearer',
                user: userData.user
              } as Session,
              user: userData.user,
              role: normalizedRole // 正規化したロールを使用
            };
          } catch (userErr) {
            console.error("トークン認証 - ユーザー情報取得中に例外:", userErr);
            
            // ユーザー情報取得に失敗してもユーザー情報は返す
            return {
              session: {
                access_token: token,
                refresh_token: '',
                expires_in: 3600,
                expires_at: 0,
                token_type: 'bearer',
                user: userData.user
              } as Session,
              user: userData.user,
              role: 'student' // デフォルトロール
            };
          }
        }
      } catch (tokenErr) {
        console.error("トークン検証中に例外:", tokenErr);
      }
    }
    
    // 2. 標準のセッション取得（Cookieベース）
    try {
      console.log("標準セッション取得を試行");
      const { data: { session }, error } = await supabaseServer.auth.getSession();
      
      if (error) {
        console.error("標準セッション取得エラー:", error);
        return null;
      }
      
      if (!session) {
        console.log("有効なセッションなし");
        return null;
      }
      
      console.log("セッション取得成功:", session.user.email);
      
      // ユーザープロフィール＋ロールをPrismaで取得（Supabase権限問題回避）
      try {
        console.log("標準セッション - Prismaでユーザー情報取得開始:", session.user.id);
        
        const userData = await prisma.users.findUnique({
          where: { id: session.user.id },
          select: { role_id: true }
        });
          
        if (!userData) {
          console.error("標準セッション - Prismaでユーザー情報が見つかりません:", session.user.id);
        }
        
        console.log("標準セッション - Prismaユーザーデータ取得結果:", userData);
        
        // ロール確認（role_idを使用）
        const rawRole = userData?.role_id || 'student';
        const normalizedRole = typeof rawRole === 'string' ? 
          rawRole.trim().toLowerCase() : rawRole;
        
        console.log("標準セッション - Prismaロール取得:", {
          roleId: userData?.role_id,
          raw: rawRole,
          normalized: normalizedRole,
          type: typeof normalizedRole
        });
        
        return {
          session,
          user: session.user,
          role: normalizedRole // 正規化したロールを使用
        };
      } catch (userErr) {
        console.error("ユーザー情報取得中に例外:", userErr);
        
        // ユーザー情報取得に失敗してもセッション情報は返す
        return {
          session,
          user: session.user,
          role: 'student' // デフォルトロール
        };
      }
    } catch (sessionErr) {
      console.error("セッション取得中に例外:", sessionErr);
    }
    
    return null;
  } catch (error) {
    console.error('セッション取得エラー:', error);
    return null;
  }
} 