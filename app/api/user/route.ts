import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// ユーザーデータの型定義
interface UserData {
  id: string;
  roleId?: string;
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

export const dynamic = 'force-dynamic';

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
      // デフォルトのroleIdは設定しない
      name: null,
      email: null,
      image: null
    };
    
    // データベースのテーブル構造と権限をテスト
    try {
      // 1. 最初の行を取得して構造確認
      console.log('---DBテーブル構造テスト開始---');
      const { data: firstUser, error: firstUserError } = await supabaseAdmin
        .from('users')
        .select('*')
        .limit(1);
        
      if (firstUserError) {
        console.error('テーブル最初の行取得エラー:', firstUserError);
      } else if (firstUser && firstUser.length > 0) {
        console.log('usersテーブル構造サンプル:', Object.keys(firstUser[0]));
        console.log('roleIdカラム存在:', 'roleId' in firstUser[0]);
        if ('roleId' in firstUser[0]) {
          console.log('roleIdカラムの型:', typeof firstUser[0].roleId);
          console.log('roleIdカラムのサンプル値:', firstUser[0].roleId);
        }
      } else {
        console.log('usersテーブルは空です');
      }
      
      // 2. 存在するすべての行のIDをカウント
      const { count, error: countError } = await supabaseAdmin
        .from('users')
        .select('id', { count: 'exact' });
        
      if (countError) {
        console.error('行カウントエラー:', countError);
      } else {
        console.log(`テーブル内の行数: ${count || 0}`);
      }
      
      console.log('---DBテーブル構造テスト終了---');
    } catch (structureErr) {
      console.error('テーブル構造テストエラー:', structureErr);
    }
    
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
        
        // メタデータにロール情報があれば一時的に設定（DBの情報が優先）
        if (authUser.user.user_metadata?.role) {
          userData.roleId = authUser.user.user_metadata.role;
          console.log('メタデータからロール検出:', userData.roleId);
        }

        // --- ここで public.users テーブルに存在しない場合は挿入／既存なら更新 ---
        try {
          const upsertPayload = {
            id: userId,
            name: userData.name,
            email: userData.email,
            image: userData.image,
            // roleId が未設定ならデフォルト student を採用
            roleId: userData.roleId || 'student'
          } as const;

          const { error: upsertError } = await supabaseAdmin
            .from('users')
            .upsert(upsertPayload, { onConflict: 'id', ignoreDuplicates: false });

          if (upsertError) {
            console.error('users テーブルへの UPSERT 失敗:', upsertError);
          } else {
            console.log('users テーブルへの UPSERT 成功/既存更新完了');
          }
        } catch (upsertErr) {
          console.error('users テーブルへの UPSERT 例外:', upsertErr);
        }
      }
    } catch (authErr) {
      console.warn('Auth APIアクセスエラー:', authErr);
    }
    
    let dbAccessSuccessful = false;
    
    // 2. users テーブルからユーザー情報取得 & role情報も同時に取得
    try {
      console.log('usersテーブルからデータ取得開始...');
      console.log('Supabase Admin URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('Service Role Key 存在確認:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
      
      // テーブル構造を確認
      console.log('テーブル構造確認...');
      try {
        const { data: tableInfo, error: tableError } = await supabaseAdmin
          .from('users')
          .select('*')
          .limit(0);
          
        if (tableError) {
          console.error('テーブル構造確認エラー:', tableError);
        } else {
          console.log('テーブルカラム:', Object.keys(tableInfo || {}));
        }
      } catch (tableErr) {
        console.error('テーブル構造確認例外:', tableErr);
      }
      
      // users テーブルから基本情報とロール情報をJOINして取得
      console.log('Supabaseサービスロールキー確認:', {
        exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
      });
      
      try {
        console.log(`User ID "${userId}"のレコードを取得中...`);
        
        // まずサービスロールを使わない純粋なクエリで試行
        const { data: directData, error: directError } = await supabaseAdmin
          .from('users')
          .select('id, roleId')
          .eq('id', userId)
          .single();
          
        if (directError) {
          console.error('直接クエリエラー:', directError);
        } else if (directData) {
          console.log('直接クエリ成功:', directData);
        }
      } catch (directErr) {
        console.error('直接クエリ例外:', directErr);
      }

      // 実際のクエリ実行
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
        console.error('usersテーブルアクセスエラー:', usersError);
        console.error('エラーコード:', usersError.code);
        console.error('エラーメッセージ:', usersError.message);
        console.error('エラー詳細:', usersError.details);
        console.error('エラーヒント:', usersError.hint);
        
        console.log('---サービスロール検証---');
        // SERVICE_ROLEでの認証確認のためのシンプルなテスト
        try {
          console.log('サービスロールアクセステスト...');
          
          // カスタムSupabaseクライアントの作成（デバッグ用）
          const { createClient } = require('@supabase/supabase-js');
          const testSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
          );
          
          // シンプルなクエリで権限テスト
          const { data: testData, error: testError } = await testSupabase
            .from('users')
            .select('count(*)', { count: 'exact' })
            .limit(1);
            
          if (testError) {
            console.error('サービスロールテストエラー:', testError);
          } else {
            console.log('サービスロールテスト成功:', testData);
            console.log('サービスロールは正常に機能しています');
          }
        } catch (testErr) {
          console.error('サービスロールテスト例外:', testErr);
        }
        console.log('---サービスロール検証終了---');
        
        // RLSポリシーのバイパステスト
        try {
          console.log('RLSバイパステスト...');
          const { data: bypassData, error: bypassError } = await supabaseAdmin
            .rpc('admin_get_user', { user_id: userId });
            
          if (bypassError) {
            console.error('RLSバイパスエラー:', bypassError);
          } else if (bypassData) {
            console.log('RLSバイパス成功:', bypassData);
            
            // RPC成功したらそのデータを使用
            if (bypassData.roleId) {
              userData.roleId = bypassData.roleId;
              console.log('RPCから取得したroleId:', userData.roleId);
              dbAccessSuccessful = true;
            }
          }
        } catch (bypassErr) {
          console.error('RLSバイパステスト例外:', bypassErr);
        }
        
      } else if (dbUser) {
        dbAccessSuccessful = true;
        console.log('usersテーブルからユーザー情報取得成功:', dbUser);
        console.log('取得した生データ:', JSON.stringify(dbUser));
        console.log('roleId直接アクセス:', dbUser.roleId);
        console.log('roleIdのタイプ:', typeof dbUser.roleId);
        
        // 型キャストで安全にアクセス
        const typedUser = dbUser as unknown as DbUserWithRole;
        
        // DBからの情報で上書き（より優先度が高い）
        userData.name = typedUser.name || userData.name;
        userData.email = typedUser.email || userData.email;
        userData.roleId = typedUser.roleId; // null/undefinedでも上書き
        userData.image = typedUser.image || userData.image;
        
        // ロール情報があれば設定
        if (typedUser.role) {
          userData.role = typedUser.role;
        }
        
        console.log('DBから取得したroleId:', userData.roleId);
      } else {
        console.warn('usersテーブルからのユーザー取得結果が空です');
      }
    } catch (usersErr) {
      console.error('usersテーブルアクセス例外:', usersErr);
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
    
    // ユーザーデータにDBから取得したロール情報も含める
    return NextResponse.json({
      ...userData,
      dbAccessSuccessful // DBアクセスの成功/失敗状態も返す
    });
  } catch (err) {
    console.error('ユーザー情報取得API エラー:', err);
    return NextResponse.json(
      { error: '内部サーバーエラー', details: String(err) }, 
      { status: 500 }
    );
  }
} 