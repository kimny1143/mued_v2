# Supabase認証への完全移行計画

## 1. NextAuth関連ファイルの特定と削除

### 削除対象ファイル・コード
- app/providers.tsxからSessionProviderを削除
- NavigationWrapperコンポーネントのuseSession使用部分をSupabaseに置き換え
- API ルートでのgetToken使用をSupabaseセッション取得に置き換え（app/api/lesson-slots/と/reservations/以下）
- NextAuth関連のパッケージ依存を削除

## 2. Supabase認証への完全移行

### クライアントコンポーネント修正
- NavigationWrapperのuseSessionをSupabaseのセッション取得で置き換え
```tsx
// app/components/NavigationWrapper.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Navigation } from './Navigation';

export function NavigationWrapper() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
    };
    
    checkSession();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setIsAuthenticated(true);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
      }
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return <Navigation isAuthenticated={isAuthenticated} />;
}
```

### APIルートの修正
- getTokenを使用しているAPIルートをSupabaseセッション取得に変更
```tsx
// app/api/lesson-slots/route.ts (例)
import { prisma } from '../../../lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// レッスンスロット作成のPOST処理
export async function POST(request: NextRequest) {
  try {
    // Supabaseクライアント初期化
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false }
      }
    );
    
    // Cookieからセッション情報を取得
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    // ユーザーロールをSupabaseから取得
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
      
    if (userError || !userData || userData.role !== 'mentor') {
      return NextResponse.json(
        { error: '講師のみがレッスン枠を作成できます' },
        { status: 403 }
      );
    }
    
    // 以下は既存のコード（データ処理部分）
    const data = await request.json();
    
    // 入力検証
    if (!data.startTime || !data.endTime) {
      return NextResponse.json(
        { error: '開始時間と終了時間は必須です' },
        { status: 400 }
      );
    }
    
    // ユーザーIDとしてセッションのIDを使用
    const userId = session.user.id;
    
    // 以下同様...
  } catch (error) {
    console.error('Error creating lesson slot:', error);
    return NextResponse.json(
      { error: 'レッスン枠の作成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
```

### テストファイルの修正
- `getToken`のモックをSupabase認証のモックに置き換え

## 3. 環境変数の整理

### 削除対象の環境変数
- NEXTAUTH_URL
- NEXTAUTH_SECRET
- GOOGLE_CLIENT_SECRET（Supabase経由で認証するため）

### 残すべき/確認すべき環境変数
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_GOOGLE_CLIENT_ID（OAuth用）
- DATABASE_URL（Prisma用）

## 4. データベース接続問題の解決

### Prismaの設定確認
- `DATABASE_URL`がSupabaseのDBに正しく接続されているか確認
- `schema.prisma`のデータベースURLが正しいか確認

### ユーザーテーブルの連携
- Supabaseの`auth.users`テーブルとPrismaの`User`テーブルの連携を確認
- 必要に応じてマイグレーションを作成

## 5. 実装計画

### Step 1: セッション管理のライブラリ作成
認証情報取得のユーティリティ関数を作成します：

```tsx
// lib/session.ts
import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

// セッション情報を取得（サーバーサイド用）
export async function getServerSession() {
  const { data, error } = await supabase.auth.getSession();
  
  if (error || !data.session) {
    return null;
  }
  
  return data.session;
}

// ユーザー情報と権限を取得（APIルート用）
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
```

### Step 2: プロバイダーの置き換え
SessionProviderを削除し、必要に応じてSupabaseセッション取得用のプロバイダーを作成します：

```tsx
// app/providers.tsx
'use client';

import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

### Step 3: API ルートをSupabaseセッション取得へ移行
APIルートのgetToken使用箇所をSupabaseセッション取得に置き換えます。

### Step 4: パッケージ依存関係の整理
不要なnext-auth関連パッケージを削除します：
```bash
npm uninstall next-auth @next-auth/prisma-adapter @auth/prisma-adapter
```

### Step 5: 環境変数の整理
.envファイル内のNextAuth関連の変数を整理します。

## 6. 移行後のテスト
- ログイン機能
- セッション維持
- APIエンドポイントの認証
- ロールベースのアクセス制御

これで、NextAuth からSupabase認証への完全な移行が実現できます。
