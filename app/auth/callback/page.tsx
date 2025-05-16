'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { getBaseUrl } from '@/lib/utils';

// useSearchParamsを使用するコンテンツコンポーネント
function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  
  useEffect(() => {
    // 認証コードの処理
    const handleCode = async () => {
      // 環境情報をログ出力（デバッグ用）
      if (typeof window !== 'undefined') {
        const currentHost = window.location.host;
        const baseUrl = getBaseUrl();
        console.log('認証コールバック - 現在のホスト:', currentHost);
        console.log('認証コールバック - ベースURL:', baseUrl);
        console.log('認証コールバック - 完全URL:', window.location.href);
        console.log('認証コールバック - VERCEL_ENV:', process.env.VERCEL_ENV || 'undefined');
        console.log('認証コールバック - VERCEL_URL:', process.env.VERCEL_URL || 'undefined');
        
        // ホスト名の不一致を検出（現在のホストがlocalhostだが、環境はVercelの場合）
        if (currentHost.includes('localhost') && 
            baseUrl !== 'http://localhost:3000' && 
            !baseUrl.includes('localhost')) {
          console.log('ホスト名の不一致を検出: Vercel URLへリダイレクト');
          const correctUrl = baseUrl + window.location.pathname + window.location.search + window.location.hash;
          console.log('修正URL:', correctUrl);
          window.location.href = correctUrl;
          return;
        }
      }
      
      if (code) {
        try {
          console.log('認証コードを処理中:', code.substring(0, 10) + '...');
          
          // detectSessionInUrl=true の場合、Supabase が自動で交換済みの可能性あり
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
            console.log('認証成功: セッション設定完了');
            
            // 適切なベースURLを取得
            const baseUrl = getBaseUrl();
            const dashboardUrl = `${baseUrl}/dashboard`;
            console.log('リダイレクト先:', dashboardUrl);
            
            // URLをチェックして適切にリダイレクト
            if (window.location.origin === baseUrl || baseUrl.includes('localhost')) {
              // 同じオリジンならルーターを使用
              router.push('/dashboard');
            } else {
              // 別オリジンならフルURLリダイレクト
              window.location.href = dashboardUrl;
            }
          } else {
            console.error('認証成功したがセッションが見つかりません');
            router.push('/login?error=session_missing');
          }
        } catch (err) {
          console.error('認証システムエラー:', err);
          router.push('/login?error=system_error');
        }
      } else {
        // ハッシュフラグメントの処理（Implicit Flow対応）
        if (typeof window !== 'undefined' && window.location.hash) {
          // #access_token=を含むハッシュを検出
          if (window.location.hash.includes('access_token')) {
            console.log('認証トークンハッシュを検出');
            
            // セッションを確認
            try {
              const { data } = await supabaseBrowser.auth.getSession();
              
              if (data.session) {
                console.log('セッションが見つかりました:', data.session.user.email);
                
                // 適切なベースURLを取得
                const baseUrl = getBaseUrl();
                const dashboardUrl = `${baseUrl}/dashboard`;
                console.log('リダイレクト先:', dashboardUrl);
                
                // URLハッシュをクリア
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // URLをチェックして適切にリダイレクト
                if (window.location.origin === baseUrl || baseUrl.includes('localhost')) {
                  router.push('/dashboard');
                } else {
                  window.location.href = dashboardUrl;
                }
                return;
              } else {
                console.log('アクセストークンはあるがセッションが見つかりません。自動設定を待機...');
                
                // Supabaseの自動セッション設定を待機
                setTimeout(async () => {
                  const { data: delayedData } = await supabaseBrowser.auth.getSession();
                  
                  if (delayedData.session) {
                    console.log('遅延セッション取得成功');
                    
                    // 適切なベースURLを取得
                    const baseUrl = getBaseUrl();
                    const dashboardUrl = `${baseUrl}/dashboard`;
                    
                    // URLをチェックして適切にリダイレクト
                    if (window.location.origin === baseUrl || baseUrl.includes('localhost')) {
                      router.push('/dashboard');
                    } else {
                      window.location.href = dashboardUrl;
                    }
                  } else {
                    router.push('/login?error=session_setup_failed');
                  }
                }, 1000);
                return;
              }
            } catch (err) {
              console.error('セッション取得エラー:', err);
            }
          }
        }
        
        // codeもhashも無い場合
        router.push('/login?error=code_missing&info=認証パラメータが見つかりません');
      }
    };

    handleCode();
  }, [code, router]);

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