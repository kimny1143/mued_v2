'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  
  useEffect(() => {
    // 認証コードの処理
    const handleCode = async () => {
      // URLを0.0.0.0からlocalhostに正規化（必要に応じて）
      if (typeof window !== 'undefined' && window.location.hostname === '0.0.0.0') {
        // URLを書き換え（同じパスとクエリ文字列を保持）
        const newUrl = window.location.href.replace('0.0.0.0', 'localhost');
        window.history.replaceState({}, document.title, newUrl);
        // リロードして正規化されたURLで処理し直す
        window.location.reload();
        return;
      }
      
      if (code) {
        try {
          // 認証コードをセッションに交換
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('認証コード交換エラー:', error.message);
            router.push(`/login?error=auth_error&message=${encodeURIComponent(error.message)}`);
            return;
          }
          
          // 成功: ダッシュボードへリダイレクト
          router.push('/dashboard');
        } catch (err) {
          console.error('認証システムエラー:', err);
          router.push('/login?error=system_error');
        }
      } else {
        // ハッシュフラグメントの処理（Implicit Flow対応）
        if (typeof window !== 'undefined' && window.location.hash) {
          // #access_tokenを含むハッシュを検出
          if (window.location.hash.includes('access_token')) {
            // Supabaseによってハッシュが自動的に処理されるように少し待機
            setTimeout(() => {
              // ダッシュボードに移動する前にセッションを確認
              const checkSession = async () => {
                const { data } = await supabase.auth.getSession();
                if (data.session) {
                  router.push('/dashboard');
                } else {
                  router.push('/login?error=セッションが見つかりません');
                }
              };
              
              checkSession();
            }, 500);
            return;
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
      </div>
    </div>
  );
} 