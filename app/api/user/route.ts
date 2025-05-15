import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// ユーザーデータの型定義
interface UserData {
  id: string;
  roleId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role?: {
    id: string;
    name: string;
    description: string | null;
  };
}

// データベースから返される型（JOIN結果）
interface DbUserWithRole {
  id: string;
  name: string | null;
  email: string | null;
  roleId: string;
  image: string | null;
  role: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

export async function GET(req: NextRequest) {
  try {
    // URLからユーザーIDを取得
    const userId = req.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが指定されていません' }, 
        { status: 400 }
      );
    }
    
    console.log(`ユーザー情報取得 API: ID=${userId}`);
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Service Role Key の長さ:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);
    
    // ユーザーデータを格納するオブジェクト
    const userData: UserData = {
      id: userId,
      roleId: 'student', // デフォルト値
      // または Google OAuth から取得した場合のデフォルト情報
      name: null,
      email: null,
      image: null
    };
    
    // 1. まず auth.users テーブルからメタデータを取得
    try {
      const { data: authUser, error: authError } = await supabaseAdmin
        .auth
        .admin
        .getUserById(userId);
        
      if (authError) {
        console.warn('Auth APIエラー:', authError);
      } else if (authUser) {
        console.log('認証ユーザー情報取得:', authUser.user.email);
        // メタデータから情報を取得
        userData.email = authUser.user.email || null;
        
        // 型安全化: undefined の場合は null を代入
        const fullName = authUser.user.user_metadata?.full_name || null;
        const name = authUser.user.user_metadata?.name || null;
        userData.name = fullName || name;
        
        const avatarUrl = authUser.user.user_metadata?.avatar_url || null;
        userData.image = avatarUrl;
      }
    } catch (authErr) {
      console.warn('Auth APIアクセスエラー:', authErr);
    }
    
    // 2. users テーブルからユーザー情報取得 & role情報も同時に取得
    try {
      // users テーブルから基本情報とロール情報をJOINして取得
      const { data: dbUser, error: usersError } = await supabaseAdmin
        .from('users')
        .select(`
          id, 
          name, 
          email, 
          roleId, 
          image,
          role:roles (
            id,
            name,
            description
          )
        `)
        .eq('id', userId)
        .single();
        
      if (usersError) {
        console.warn('usersテーブルアクセスエラー:', usersError);
      } else if (dbUser) {
        console.log('usersテーブルからユーザー情報取得成功:', dbUser);
        
        // 型キャストで安全にアクセス
        const typedUser = dbUser as unknown as DbUserWithRole;
        
        // DBからの情報で上書き（より優先度が高い）
        userData.name = typedUser.name || userData.name;
        userData.email = typedUser.email || userData.email;
        userData.roleId = typedUser.roleId || userData.roleId;
        userData.image = typedUser.image || userData.image;
        
        // ロール情報があれば設定
        if (typedUser.role) {
          userData.role = typedUser.role;
        }
      }
    } catch (usersErr) {
      console.warn('usersテーブルアクセスエラー (例外):', usersErr);
    }
    
    // 最終確認: ユーザー情報が取得できたか
    if (!userData.name && !userData.email) {
      console.warn('ユーザー情報が見つかりませんでした');
      return NextResponse.json(
        { 
          error: 'ユーザー情報が見つかりません',
          userId,
          checked_tables: ['auth.users', 'public.users']
        }, 
        { status: 404 }
      );
    }
    
    console.log(`ユーザー情報取得成功: ${userData.name || userData.email}`);
    console.log('最終ユーザーデータ:', userData);
    
    return NextResponse.json(userData);
  } catch (err) {
    console.error('ユーザー情報取得API エラー:', err);
    return NextResponse.json(
      { error: '内部サーバーエラー', details: String(err) }, 
      { status: 500 }
    );
  }
} 