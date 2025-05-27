import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { prisma } from '@/lib/prisma'; // Prismaクライアントをインポート

// ユーザーデータの型定義
interface UserData {
  id: string;
  role_id?: string; // スネークケースに統一
  roleName?: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role?: {
    id: string;
    name: string;
    description: string | null;
  };
}

// ロール情報を含むユーザーの型定義
interface DbUserWithRole {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role_id: string; // スネークケースに統一
  role?: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

// このAPIルートは動的であることを明示的に宣言
export const dynamic = 'force-dynamic';

/**
 * ユーザー詳細情報を取得するAPIエンドポイント
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    console.log(`ユーザー情報取得 API: ID=${userId}`);

    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Service Role Key の長さ:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);

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
        console.log('role_idカラム存在:', 'role_id' in firstUser[0]);
        if ('role_id' in firstUser[0]) {
          console.log('role_idカラムの型:', typeof firstUser[0].role_id);
          console.log('role_idカラムのサンプル値:', firstUser[0].role_id);
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

    // ユーザーデータの基本情報を初期化
    const userData: UserData = {
      id: userId,
      name: null,
      email: null,
      image: null
    };

    // auth.usersテーブルからの情報取得
    try {
      console.log('認証ユーザー情報取得:', userId);
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (authUser?.user) {
        console.log('認証ユーザー情報取得:', authUser.user.email);
        userData.name = authUser.user.user_metadata?.name || 
                       authUser.user.user_metadata?.full_name || 
                       authUser.user.email?.split('@')[0] || null;
        userData.email = authUser.user.email;
        userData.image = authUser.user.user_metadata?.avatar_url || null;

                 // メタデータからロール情報を一時取得（フォールバック用）
         if (authUser.user.user_metadata?.role) {
           userData.role_id = authUser.user.user_metadata.role;
         }

        // --- ここで public.users テーブルに存在しない場合は挿入／既存なら更新 ---
        try {
          // 既存レコードの role_id を保持するため、role_id は upsert で更新しない。
          // 新規挿入後に meta の role が存在すれば別途 update で上書きする。
          const upsertPayload = {
            id: userId,
            name: userData.name,
            email: userData.email,
            image: userData.image
          } as const;

          const { error: upsertError } = await supabaseAdmin
            .from('users')
            .upsert(upsertPayload, { onConflict: 'id', ignoreDuplicates: true });

          if (upsertError) {
            console.error('users テーブルへの UPSERT 失敗:', upsertError);
          } else {
            console.log('users テーブルへの UPSERT 成功/既存更新完了');

            // メタデータに role があり、かつ student 以外の場合 DB を更新しておく
            if (userData.role_id && userData.role_id !== 'student') {
              const { error: roleUpdateError } = await supabaseAdmin
                .from('users')
                .update({ role_id: userData.role_id })
                .eq('id', userId);

              if (roleUpdateError) {
                console.error('role_id 自動更新失敗:', roleUpdateError);
              } else {
                console.log('role_id 自動更新成功:', userData.role_id);
              }
            }
          }
        } catch (upsertErr) {
          console.error('users テーブルへの UPSERT 例外:', upsertErr);
        }
      }
    } catch (authErr) {
      console.warn('Auth APIアクセスエラー:', authErr);
    }
    
    let dbAccessSuccessful = false;

    // usersテーブルから詳細なユーザー情報を取得
    try {
      console.log('usersテーブルからデータ取得開始...');
      console.log('Supabase Admin URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('Service Role Key 存在確認:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
      
      console.log('テーブル構造確認...');
      const testQuery = await supabaseAdmin
        .from('users')
        .select('*')
        .limit(0);
      console.log('テーブルカラム:', testQuery.data ? Object.keys(testQuery.data) : []);
      
      console.log('Supabaseサービスロールキー確認:', {
        exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length
      });
      
      try {
        console.log(`User ID "${userId}"のレコードを取得中...`);
        
        // まずサービスロールを使わない純粋なクエリで試行
        const { data: directData, error: directError } = await supabaseAdmin
          .from('users')
          .select('id, role_id')
          .eq('id', userId)
          .single();
          
        if (directError) {
          console.error('直接クエリエラー:', directError);
        } else if (directData) {
          console.log('直接クエリ成功:', directData);

          // JOIN が失敗した場合にも備えて role_id を一時保存
          if (directData.role_id) {
            if (!userData.role_id) {
              userData.role_id = directData.role_id;
            }
            dbAccessSuccessful = true;
          }
        }
      } catch (directErr) {
        console.error('直接クエリ例外:', directErr);
      }

      // 実際のクエリ実行 - 複数の外部キー制約がある場合の対応
      let dbUser = null;
      let usersError = null;
      
      // まず標準的なJOINを試行
      const { data: standardJoin, error: standardError } = await supabaseAdmin
        .from('users')
        .select(`
          id, 
          name, 
          email, 
          role_id, 
          image,
          role:roles (
            id,
            name,
            description
          )
        `)
        .eq('id', userId)
        .single();
      
      if (standardError) {
        console.log('標準JOIN失敗:', standardError.message);
        usersError = standardError;
        
        // 外部キー制約名を試行錯誤
        console.log('代替JOINを試行...');
        const joinAttempts = [
          'roles!users_role_id_fkey',  // 正しいはずの名前
          'roles!fk_users_role_id',    // 別の可能性
          'roles',                     // シンプルなJOIN
        ];
        
        for (const joinName of joinAttempts) {
          try {
            console.log(`JOIN試行: ${joinName}`);
            const { data: altData, error: altError } = await supabaseAdmin
              .from('users')
              .select(`id, name, email, role_id, image, role:${joinName}(id, name, description)`)
              .eq('id', userId)
              .single();
            
            if (!altError && altData) {
              console.log(`${joinName}でJOIN成功:`, altData);
              dbUser = altData;
              usersError = null;
              break;
            } else {
              console.log(`${joinName}失敗:`, altError?.message);
            }
          } catch (err) {
            console.log(`${joinName}例外:`, err);
          }
        }
        
        // 全てのJOINが失敗した場合、ロール情報なしでユーザー情報のみ取得
        if (!dbUser) {
          console.log('ロール情報なしでユーザー情報のみ取得を試行...');
          const { data: userOnly, error: userOnlyError } = await supabaseAdmin
            .from('users')
            .select('id, name, email, role_id, image')
            .eq('id', userId)
            .single();
          
          if (userOnlyError) {
            console.error('ユーザー情報のみ取得も失敗:', userOnlyError);
            usersError = userOnlyError;
          } else {
            console.log('ユーザー情報のみ取得成功:', userOnly);
            dbUser = userOnly;
            usersError = null;
          }
        }
      } else {
        console.log('標準JOIN成功:', standardJoin);
        dbUser = standardJoin;
      }

      // エラーハンドリング詳細
      if (usersError) {
        console.error('usersテーブルアクセスエラー:', usersError);
        console.error('エラーコード:', usersError.code);
        console.error('エラーメッセージ:', usersError.message);
        console.error('エラー詳細:', usersError.details);
        console.error('エラーヒント:', usersError.hint);
        
        // サービスロール権限の検証
        console.log('---サービスロール検証---');
        try {
          console.log('サービスロールアクセステスト...');
          const { data: serviceTest, error: serviceError } = await supabaseAdmin
            .from('users')
            .select('id')
            .limit(1);
          
          if (serviceError) {
            console.error('サービスロールテストエラー:', serviceError);
          } else {
            console.log('サービスロールアクセス成功:', serviceTest?.length || 0, '件');
          }
        } catch (serviceErr) {
          console.error('サービスロール検証例外:', serviceErr);
        }
        console.log('---サービスロール検証終了---');
        
        // RLSバイパステスト
        try {
          console.log('RLSバイパステスト...');
          const { data: bypassData, error: bypassError } = await supabaseAdmin
            .rpc('admin_get_user', { user_id: userId });
          
          if (bypassError) {
            console.error('RLSバイパスエラー:', bypassError);
          } else {
            console.log('RLSバイパス成功:', bypassData);
            if (bypassData) {
              dbUser = bypassData;
              usersError = null;
            }
          }
        } catch (bypassErr) {
          console.error('RLSバイパス例外:', bypassErr);
        }
      } else if (dbUser) {
        dbAccessSuccessful = true;
        console.log('usersテーブルからユーザー情報取得成功:', dbUser);
        console.log('取得した生データ:', JSON.stringify(dbUser));
        console.log('role_id直接アクセス:', dbUser.role_id);
        console.log('role_idのタイプ:', typeof dbUser.role_id);
        
        // 型キャストで安全にアクセス
        const typedUser = dbUser as unknown as DbUserWithRole;
        
        // DBからの情報で上書き（より優先度が高い）
        userData.name = typedUser.name || userData.name;
        userData.email = typedUser.email || userData.email;
        userData.role_id = typedUser.role_id; // null/undefinedでも上書き
        userData.image = typedUser.image || userData.image;
        
        // ロール情報があれば設定
        if (typedUser.role) {
          userData.role = typedUser.role;
          // ロール名を別途保存 (重要: フロントエンドでの判定に使用)
          userData.roleName = typedUser.role.name.toLowerCase();
          console.log('DBから取得したロール名:', userData.roleName);
        }
        
        console.log('DBから取得したrole_id:', userData.role_id);
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
    
    // Supabaseアクセスが失敗した場合、Prismaを使って直接取得を試みる
    if (!dbAccessSuccessful) {
      try {
        console.log('Supabaseアクセス失敗: Prismaを使用した直接DBアクセスを試みます...');
        
        // Prismaを使ってユーザー情報とロールを取得
        const dbUser = await prisma.users.findUnique({
          where: { id: userId },
          include: { roles: true }
        });
        
        if (dbUser && dbUser.roles) {
          console.log('Prismaによるユーザー情報取得成功:', dbUser.email);
          console.log('取得したロール情報:', dbUser.roles);
          
          // 取得したロール情報を設定
          userData.role_id = dbUser.role_id;
          userData.roleName = dbUser.roles.name.toLowerCase();
          dbAccessSuccessful = true;
          
          console.log('Prismaから設定したロール名:', userData.roleName);
        } else {
          console.error('Prismaからのユーザー取得に失敗しました');
          return NextResponse.json({
            error: 'データベースからユーザー情報を取得できませんでした',
            userId,
            status: 'DATABASE_ERROR'
          }, { status: 500 });
        }
      } catch (prismaError) {
        console.error('Prismaアクセスエラー:', prismaError);
        // データベースアクセスできない場合はエラーを返す
        return NextResponse.json({
          error: 'データベース接続エラー',
          details: String(prismaError),
          userId
        }, { status: 500 });
      }
    }
    
    // ユーザーデータにDBから取得したロール情報も含める
    return NextResponse.json({
      ...userData,
      // role_idがUUID形式になっている場合に備えて、デフォルトのroleName値を設定
      roleName: userData.roleName || (userData.role?.name?.toLowerCase() || 'student'),
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