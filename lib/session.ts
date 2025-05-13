import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

/**
 * セッション情報を取得（サーバーサイド用）
 * @returns サーバーサイドでのセッション情報
 */
export async function getServerSession() {
  const { data, error } = await supabase.auth.getSession();
  
  if (error || !data.session) {
    return null;
  }
  
  return data.session;
}

/**
 * ユーザー情報と権限を取得（APIルート用）
 * @returns ユーザー情報と権限、または認証されていない場合はnull
 */
export async function getAuthenticatedUser(): Promise<{user: User, role: string} | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  
  if (!sessionData?.session?.user) {
    return null;
  }
  
  // ユーザープロフィール＋ロールを取得
  const { data: userData, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', sessionData.session.user.id)
    .single();
    
  if (error || !userData) {
    return null;
  }
  
  return {
    user: sessionData.session.user,
    role: userData.role || 'student' // デフォルト権限
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
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return null;
    }
    
    // ユーザープロフィール＋ロールを取得
    const { data: userData, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
      
    return {
      session,
      user: session.user,
      role: userData?.role
    };
  } catch (error) {
    console.error('セッション取得エラー:', error);
    return null;
  }
} 