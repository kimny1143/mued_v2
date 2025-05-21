import { supabaseServer } from './supabase-server';
import { supabaseAdmin } from './supabase-admin';
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
        const role = await prisma.role.findUnique({
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
  
  // ユーザー情報＋ロールをusersテーブルから取得
  const { data: userData, error: userError } = await supabaseServer
    .from('users')
    .select('roleId, role:roles!users_roleId_fkey(name)')
    .eq('id', sessionData.session.user.id)
    .single();
    
  if (userError) {
    console.error("ユーザー情報取得エラー:", userError);
    return null;
  }
  
  if (!userData) {
    console.log("ユーザー情報なし");
    return null;
  }
  
  console.log("ユーザーデータ取得結果:", userData);
  
  // role.nameを優先的に使用し、なければroleIdからロール名を取得
  const roleName = extractRoleName(userData.role);
  let finalRole = roleName;
  
  // role.nameが取得できなかった場合はroleIdから決定
  if (!finalRole && userData.roleId) {
    finalRole = await getRoleNameById(userData.roleId);
  }
  
  // それでも取得できなければデフォルト値
  if (!finalRole) {
    finalRole = 'student';
  }
  
  console.log("ロール名抽出:", {
    roleRaw: userData.role,
    roleId: userData.roleId,
    extracted: roleName,
    final: finalRole
  });
  
  return {
    user: sessionData.session.user,
    role: finalRole.toLowerCase()
  };
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
    
    // Authorization ヘッダーが無ければ Cookie から取得（sb-access-token）
    if (!token) {
      const cookieHeader = request.headers.get('cookie') || '';
      // Supabase v2 cookie key: sb-<projectRef>-access-token
      // projectRef 付き  or  なし の両方を許可
      const match = cookieHeader.match(/sb-(?:[^=]+-)?access-token=([^;]+)/);
      if (match && match[1]) {
        token = decodeURIComponent(match[1]);
        console.log("Cookie からアクセストークン取得:", token.substring(0, 10) + '...');
      } else {
        console.log("Cookie に sb-access-token が見つかりませんでした");
      }
    }
    
    if (!token) {
      console.log("有効なトークンがヘッダーにも Cookie にも見つかりませんでした");
    }
    
    // 1. Authorizationヘッダーがあればそこからトークンを使ってセッション検証
    if (token) {
      try {
        console.log(`トークン認証開始 (${token.substring(0, 10)}...)`);
        // サービスロール権限を使用してJWTを検証し、ユーザー情報を取得
        const { data, error } = await supabaseAdmin.auth.getUser(token);
        
        if (error) {
          console.error("トークン認証エラー:", error);
        } else if (data?.user) {
          console.log("トークンからユーザー取得成功:", data.user.email);
          
          // ユーザー情報＋ロールをusersテーブルから取得
          try {
            // トークン付きの一時 Supabase クライアントを生成（RLS により anon key だけでは参照できない場合に対応）
            const supabaseWithAuth = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              {
                global: {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                },
              }
            );

            const { data: userData, error: userError } = await supabaseWithAuth
              .from('users')
              .select('roleId, role:roles!users_roleId_fkey(name)')
              .eq('id', data.user.id)
              .single();
              
            if (userError) {
              console.error("ユーザー情報取得エラー:", userError);
            }
            
            console.log("ユーザーデータ取得結果:", userData);
            
            // ロール確認（role.nameを優先的に使用）
            const roleName = extractRoleName(userData?.role);
            
            console.log("API認証用ロール名抽出:", {
              roleRaw: userData?.role,
              isArray: userData?.role ? Array.isArray(userData.role) : false,
              extracted: roleName
            });
            
            const rawRole = roleName || userData?.roleId || 'student';
            const normalizedRole = typeof rawRole === 'string' ? 
              rawRole.trim().toLowerCase() : rawRole;
            
            console.log("ロール正規化:", {
              roleName,
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
                user: data.user
              } as Session,
              user: data.user,
              role: normalizedRole // 正規化したロールを使用
            };
          } catch (userErr) {
            console.error("ユーザー情報取得中に例外:", userErr);
            
            // ユーザー情報取得に失敗してもユーザー情報は返す
            return {
              session: {
                access_token: token,
                refresh_token: '',
                expires_in: 3600,
                expires_at: 0,
                token_type: 'bearer',
                user: data.user
              } as Session,
              user: data.user,
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
      
      // ユーザープロフィール＋ロールをusersテーブルから取得
      try {
        const { data: userData, error: userError } = await supabaseServer
          .from('users')
          .select('roleId, role:roles!users_roleId_fkey(name)')
          .eq('id', session.user.id)
          .single();
          
        if (userError) {
          console.error("ユーザー情報取得エラー:", userError);
        }
        
        console.log("ユーザーデータ取得結果:", userData);
        
        // ロール確認（role.nameを優先的に使用）
        const roleName = extractRoleName(userData?.role);
        
        console.log("標準セッション用ロール名抽出:", {
          roleRaw: userData?.role,
          isArray: userData?.role ? Array.isArray(userData.role) : false,
          extracted: roleName
        });
        
        const rawRole = roleName || userData?.roleId || 'student';
        const normalizedRole = typeof rawRole === 'string' ? 
          rawRole.trim().toLowerCase() : rawRole;
        
        console.log("ロール正規化:", {
          roleName,
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