'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';

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

  const handleUpdateSubscription = async () => {
    if (!session) {
      setError('ログインが必要です');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // 直接DBにアクセスするAPIを呼び出す
      const response = await fetch('/api/direct-db-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json() as ApiResponse;

      if (response.ok) {
        setResult(data);
        // 成功したらページを再読み込み
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setError(data.error || 'エラーが発生しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">サブスクリプションテスト</h2>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          サブスクリプションデータをテスト用に作成します。
          このボタンを押すと、現在ログイン中のユーザーのサブスクリプションステータスが「アクティブ」に設定されます。
        </p>
        
        <button
          onClick={handleUpdateSubscription}
          disabled={loading || !session}
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