'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        setIsProcessing(true);
        
        const error = searchParams.get('error');
        const errorCode = searchParams.get('error_code');
        const errorDescription = searchParams.get('error_description');
        const code = searchParams.get('code');
        
        // エラーパラメータがある場合
        if (error || errorCode) {
          console.error('[Auth Callback] Error detected:', {
            error,
            errorCode,
            errorDescription
          });
          router.push(`/m/login?error=${error || errorCode}&message=${encodeURIComponent(errorDescription || 'エラーが発生しました')}`);
          return;
        }

        console.log('[Auth Callback] Processing callback...', { 
          hasCode: !!code,
          hasError: !!(error || errorCode)
        });
        
        // Supabaseは自動的にURLから認証コードを処理するため、手動交換は不要
        // 少し待ってからセッションを確認
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // セッションを確認
        const { data: { session }, error: sessionError } = await supabaseBrowser.auth.getSession();
        
        if (sessionError) {
          console.error('[Auth Callback] Session error:', sessionError);
          router.push(`/m/login?error=session_error&message=${encodeURIComponent(sessionError.message)}`);
          return;
        }
        
        if (session) {
          console.log('[Auth Callback] Success:', {
            user: session.user.email,
            expires_at: session.expires_at
          });
          
          // 認証成功時は即座にリダイレクト
          router.push('/m/dashboard');
        } else {
          console.error('[Auth Callback] No session found');
          router.push('/m/login?error=no_session&message=認証セッションが見つかりませんでした');
        }
        
      } catch (error) {
        console.error('[Auth Callback] Unexpected error:', error);
        router.push('/m/login?error=auth_failed&message=認証処理でエラーが発生しました');
      } finally {
        setIsProcessing(false);
      }
    };

    // 認証状態変更の監視（冗長なリダイレクトを防ぐため簡素化）
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth Callback] Auth state change:', event, session?.user?.email || 'No user');
        // 手動処理に任せるため、ここでのリダイレクトは行わない
      }
    );

    handleCallback();

    // クリーンアップ
    return () => {
      subscription.unsubscribe();
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">
          {isProcessing ? '認証処理中...' : '認証完了'}
        </p>
        {!isProcessing && (
          <p className="text-sm text-gray-500 mt-2">ダッシュボードに移動中...</p>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}