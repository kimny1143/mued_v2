'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { signInWithGoogle } from '@/app/actions/auth';

// 検索パラメータを使用するコンポーネント
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const message = searchParams.get('message');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // URLのエラーパラメータがあれば表示
  useEffect(() => {
    if (error) {
      setErrorMsg(`${error}${message ? `: ${message}` : ''}`);
    }
  }, [error, message]);
  
  // ハッシュフラグメントからのトークン処理（Implicit Flow対応）
  useEffect(() => {
    // クライアント側でのみ実行
    if (typeof window !== 'undefined') {
      const handleHashChange = async () => {
        // #access_token=...の形式のハッシュがあるか確認
        if (window.location.hash && window.location.hash.includes('access_token')) {
          setIsLoading(true);
          
          try {
            // ハッシュフラグメントからセッションを設定
            const hashUrl = window.location.href;
            const { data, error } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                skipBrowserRedirect: true,
              },
            });
            
            if (error) {
              console.error('セッション取得エラー:', error.message);
              setErrorMsg('認証トークンの処理に失敗しました');
            } else {
              // セッション設定成功
              console.log('セッション設定成功');
              // URLのハッシュ部分をクリア
              window.history.replaceState(
                {}, 
                document.title, 
                window.location.pathname + window.location.search
              );
              router.push('/dashboard');
            }
          } catch (err) {
            console.error('認証エラー:', err);
            setErrorMsg('認証処理中にエラーが発生しました');
          } finally {
            setIsLoading(false);
          }
        }
      };
      
      // ページロード時に実行
      handleHashChange();
      
      // hashchangeイベントリスナーを追加
      window.addEventListener('hashchange', handleHashChange);
      return () => {
        window.removeEventListener('hashchange', handleHashChange);
      };
    }
  }, [router]);
  
  // ログイン済みならリダイレクト
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.push('/dashboard');
      }
    };
    
    checkSession();
  }, [router]);
  
  // Google認証でサインイン
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    
    try {
      // サーバーアクションを呼び出し
      await signInWithGoogle();
      // 注: リダイレクトはサーバーアクション内で行われるため、
      // この下のコードは実行されません
    } catch (err) {
      console.error('Googleログインエラー:', err);
      setErrorMsg('Googleログインに失敗しました');
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">MUED LMS</h2>
          <p className="mt-2 text-sm text-gray-600">音楽制作のための学習管理システム</p>
        </div>
        
        {errorMsg && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {errorMsg}
          </div>
        )}
        
        <div className="mt-8 space-y-6">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
              </g>
            </svg>
            {isLoading ? 'ログイン中...' : 'Googleでログイン'}
          </button>
          
          <div className="text-center text-sm">
            <p className="text-gray-600">
              アカウントをお持ちでない場合は
              <Link href="/register" className="ml-1 font-medium text-indigo-600 hover:text-indigo-500">
                新規登録
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// メインコンポーネント
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">ロード中...</div>}>
      <LoginContent />
    </Suspense>
  );
} 