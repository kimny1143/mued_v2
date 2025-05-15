import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

/**
 * セッション情報を取得（サーバーサイド用）
 * @returns サーバーサイドでのセッション情報
 */
export async function getServerSession() {
  const { data, error } = await supabase.auth.getSession();
  
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
  const { data: sessionData, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error("認証ユーザー取得エラー:", error);
    return null;
  }
  
  if (!sessionData?.session?.user) {
    console.log("認証されたユーザーなし");
    return null;
  }
  
  // ユーザー情報＋ロールをusersテーブルから取得
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('roleId, role:roles(name)')
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
  
  return {
    user: sessionData.session.user,
    role: userData.roleId || 'student' // roleIdを使用
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
    
    // ヘッダーから認証トークンを取得
    const authHeader = request.headers.get('Authorization');
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log("Authorizationヘッダーからトークン検出:", token.substring(0, 10) + '...');
    } else {
      console.log("Authorizationヘッダーなし - Cookieセッション試行");
    }
    
    // 1. Authorizationヘッダーがあればそこからトークンを使ってセッション検証
    if (token) {
      try {
        const { data, error } = await supabase.auth.getUser(token);
        
        if (error) {
          console.error("トークン認証エラー:", error);
        } else if (data?.user) {
          console.log("トークンからユーザー取得成功:", data.user.email);
          
          // ユーザー情報＋ロールをusersテーブルから取得
          try {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('roleId, role:roles(name)')
              .eq('id', data.user.id)
              .single();
              
            if (userError) {
              console.error("ユーザー情報取得エラー:", userError);
            }
            
            console.log("ユーザーデータ取得結果:", userData);
            
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
              role: userData?.roleId || 'student' // roleIdを使用
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
      const { data: { session }, error } = await supabase.auth.getSession();
      
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
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('roleId, role:roles(name)')
          .eq('id', session.user.id)
          .single();
          
        if (userError) {
          console.error("ユーザー情報取得エラー:", userError);
        }
        
        console.log("ユーザーデータ取得結果:", userData);
        
        return {
          session,
          user: session.user,
          role: userData?.roleId || 'student' // roleIdを使用
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