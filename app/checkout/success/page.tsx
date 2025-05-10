'use client';

import { useEffect, useState, Suspense } from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@ui/button';
import { Card } from '@ui/card';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

// useSearchParamsを使用するコンテンツコンポーネント
function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // 5秒後にダッシュボードにリダイレクト
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 5000);

    // カウントダウン処理
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [router]);

  return (
    <div className="container max-w-3xl py-12 mx-auto">
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold">決済が完了しました！</h1>
          
          <p className="text-gray-600">
            ご購入いただき、ありがとうございます。サブスクリプションが正常に処理されました。
          </p>
          
          {sessionId && (
            <p className="text-sm text-gray-500">
              セッションID: {sessionId}
            </p>
          )}
          
          <div className="border-t border-gray-200 w-full pt-4 mt-4">
            <p className="text-gray-600 mb-4">
              {countdown}秒後にダッシュボードに移動します...
            </p>
            
            <Link href="/dashboard">
              <Button>今すぐダッシュボードに移動</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Suspenseでラップした親コンポーネント
export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">ロード中...</div>}>
      <CheckoutSuccessContent />
    </Suspense>
  );
} 