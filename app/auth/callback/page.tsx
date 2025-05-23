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
    
    // 認証コードかハッシュフラグメントの処理
    const handleAuth = async () => {
      // 環境情報をログ出力（デバッグ用）
      if (typeof window !== 'undefined') {
        const currentHost = window.location.host;
        const baseUrl = getBaseUrl();
        console.log('認証コールバック - 現在のホスト:', currentHost);
        console.log('認証コールバック - ベースURL:', baseUrl);
        console.log('認証コールバック - 完全URL:', window.location.href);
        console.log('認証コールバック - URLハッシュ:', window.location.hash || 'なし');
        console.log('認証コールバック - VERCEL_ENV:', process.env.VERCEL_ENV || 'undefined');
      }
      
      // 認証コードの処理（PKCEフロー）
      if (code) {
        try {
          console.log('認証コードを処理中:', code.substring(0, 10) + '...');
          
          // セッションをチェック
          let { data: sessionData } = await supabaseBrowser.auth.getSession();

          if (!sessionData.session) {
            // 未交換なら手動で交換
            const { error } = await supabaseBrowser.auth.exchangeCodeForSession(code);
            if (error) {
              console.error('認証コード交換エラー:', error.message);
              router.push(`/login?error=auth_error&message=${encodeURIComponent(error.message)}`);
              return;
            }

            // 交換後に再取得
            ({ data: sessionData } = await supabaseBrowser.auth.getSession());
          }
          
          if (sessionData.session) {
            // ダッシュボードへリダイレクト
            router.push('/dashboard');
          } else {
            console.error('認証成功したがセッションが見つかりません');
            router.push('/login?error=session_missing');
          }
        } catch (err) {
          console.error('認証システムエラー:', err);
          router.push('/login?error=system_error');
        }
      } 
      // ハッシュフラグメントの処理（Implicitフロー）
      else if (typeof window !== 'undefined' && 
               (window.location.hash.includes('access_token') || 
                window.location.hash.includes('id_token'))) {
        try {
          console.log('トークンハッシュを検出:', window.location.hash.substring(0, 20) + '...');
          
          // セッションを確認（supabaseBrowserのdetectSessionInUrlはfalseなので手動処理）
          // 注: 実際のハッシュ処理はSupabaseの内部メカニズムによって行われるが、
          // ここではセッション取得を試みる
          
          // セッションチェック
          const { data } = await supabaseBrowser.auth.getSession();
          
          if (data.session) {
            console.log('セッション取得成功:', data.session.user.email);
            router.push('/dashboard');
          } else {
            // セッションが見つからない場合は、ハッシュの手動処理を試みる
            console.log('セッションが見つかりません。リロードを試みます...');
            
            // アクセストークンがある場合は、セッションを設定
            try {
              // ハッシュを解析する
              const hashParams = new URLSearchParams(window.location.hash.substring(1));
              const accessToken = hashParams.get('access_token');
              
              if (accessToken) {
                console.log('アクセストークンを検出。セッション設定を試みます...');
                
                // ハッシュを削除（セキュリティのため）
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // セッションのリロードを促すため、ページをリロード
                setTimeout(() => {
                  window.location.reload();
                }, 500);
                return;
              }
            } catch (e) {
              console.error('ハッシュ処理エラー:', e);
            }
            
            // 最終手段としてのリダイレクト
            router.push('/login?error=session_setup_failed');
          }
        } catch (err) {
          console.error('セッション取得エラー:', err);
          router.push('/login?error=session_error');
        }
      }
      // codeもhashも無い場合
      else {
        console.error('認証パラメータが見つかりません');
        router.push('/login?error=code_missing&info=認証パラメータが見つかりません');
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