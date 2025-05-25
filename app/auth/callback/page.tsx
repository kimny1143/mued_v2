'use client';

export const dynamic = 'force-dynamic';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { getBaseUrl } from '@/lib/utils';

// useSearchParamsを使用するコンテンツコンポーネント
function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorCode = searchParams.get('error_code');
  const errorDescription = searchParams.get('error_description');
  
  useEffect(() => {
    // エラーパラメータが存在する場合はそれを処理
    if (error || errorCode) {
      console.error('認証エラーパラメータ検出:', {
        error,
        errorCode,
        errorDescription
      });
      
      router.push(`/login?error=${error || errorCode}&message=${encodeURIComponent(errorDescription || 'エラーが発生しました')}`);
      return;
    }
    
    // PKCEフローでの認証処理
    const handleAuth = async () => {
      try {
        console.log('認証コールバック処理開始...');
        
        // Supabaseが自動的にURLからセッションを検出・設定するまで少し待つ
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // セッションを取得
        const { data: { session }, error } = await supabaseBrowser.auth.getSession();
        
        if (error) {
          console.error('セッション取得エラー:', error.message);
          router.push(`/login?error=session_error&message=${encodeURIComponent(error.message)}`);
          return;
        }
        
        if (session) {
          console.log('認証成功:', session.user.email);
          router.push('/dashboard');
        } else {
          console.error('セッションが見つかりません');
          router.push('/login?error=no_session');
        }
        
      } catch (err) {
        console.error('認証処理エラー:', err);
        router.push('/login?error=auth_failed');
      }
    };

    handleAuth();
  }, [code, error, errorCode, errorDescription, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-lg">認証処理中...</p>
        <div className="mt-4 animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500">Supabase認証情報を処理しています...</p>
      </div>
    </div>
  );
}

// Suspenseでラップした親コンポーネント
export default function AuthCallback() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">ロード中...</div>}>
      <CallbackContent />
    </Suspense>
  );
} 