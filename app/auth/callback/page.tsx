'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/**
 * 現在の環境に応じたベースURLを取得する関数
 */
function getBaseUrl() {
  // Vercel環境変数があればそれを使用
  if (typeof window !== 'undefined' && window.location.host) {
    // 現在表示されているページのホスト名を優先（最も正確）
    return window.location.protocol + '//' + window.location.host;
  }
  
  // Vercel環境変数があればそれを使用
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  
  // 本番環境の場合
  if (process.env.VERCEL_ENV === 'production') {
    return 'https://mued-lms-fgm.vercel.app';
  }
  
  // 明示的に設定された場合はそれを使用
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  
  // ローカル開発環境
  return 'http://localhost:3000';
}

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
        console.log('認証コールバック - VERCEL_ENV:', process.env.VERCEL_ENV || 'undefined');
        console.log('認証コールバック - VERCEL_URL:', process.env.VERCEL_URL || 'undefined');
        
        // ホスト名の不一致を検出（localhostが紛れ込んだ場合など）
        if (currentHost.includes('localhost') && !baseUrl.includes('localhost')) {
          console.log('ホスト名の不一致を検出: Vercel URLへリダイレクト');
          window.location.href = baseUrl + window.location.pathname + window.location.search;
          return;
        }
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
          
          // セッションが正しく設定されたか確認
          const { data: sessionData } = await supabase.auth.getSession();
          
          if (sessionData.session) {
            console.log('認証成功: セッション設定完了');
            // 成功: ダッシュボードへリダイレクト
            router.push('/dashboard');
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

// Suspenseでラップした親コンポーネント
export default function AuthCallback() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">ロード中...</div>}>
      <CallbackContent />
    </Suspense>
  );
} 