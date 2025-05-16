'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface StripeTestClientProps {
  session: User | null;
}

interface ApiResponse {
  success?: boolean;
  message?: string;
  subscription?: unknown;
  error?: string;
  details?: unknown;
}

export default function StripeTestClient({ session }: StripeTestClientProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);

  useEffect(() => {
    // 初期表示時にセッション情報を取得
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      console.log('現在のセッション情報:', data);
      setSessionData(data.session);
    };
    checkSession();
  }, []);

  const handleUpdateSubscription = async () => {
    // セッションの再取得を試行
    const { data } = await supabase.auth.getSession();
    const sessionUser = data.session?.user || session;
    
    if (!sessionUser) {
      setError('ログインが必要です。ログインしてからもう一度お試しください。');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // 新しいエンドポイントを使用：ユーザーIDを明示的に送信
      const response = await fetch('/api/direct-subscription-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: sessionUser.id
        })
      });

      const data = await response.json() as ApiResponse;

      if (response.ok) {
        setResult(data);
        // 成功したらページを再読み込み
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        // エラー時には詳細情報をコンソールに出力
        console.error('APIエラー:', data);
        setError(data.error || 'エラーが発生しました');
      }
    } catch (err) {
      console.error('リクエストエラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md my-4">
      <h2 className="text-xl font-bold mb-4">サブスクリプションテスト</h2>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          サブスクリプションデータをテスト用に作成します。
          このボタンを押すと、現在ログイン中のユーザーのサブスクリプションステータスが「アクティブ」に設定されます。
        </p>
        
        {sessionData ? (
          <div className="text-xs text-gray-500 mb-2">
            <p>認証状態: アクティブ</p>
            <p>ユーザーID: {sessionData.user?.id}</p>
          </div>
        ) : (
          <div className="text-xs text-red-500 mb-2">認証情報が取得できていません</div>
        )}
        
        <button
          onClick={handleUpdateSubscription}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? '処理中...' : 'サブスクリプションをアクティブに設定'}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-600">
          <p className="font-bold">エラー</p>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded">
          <p className="font-bold text-green-700">処理結果</p>
          <pre className="mt-2 text-sm overflow-auto max-h-40">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 