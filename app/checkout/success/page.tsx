'use client';

import { useEffect, useState, Suspense } from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@ui/button';
import { Card } from '@ui/card';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

// useSearchParamsを使用するコンテンツコンポーネント
function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  const sessionId = searchParams.get('session_id');
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // サブスクリプションステータスを確認
    async function checkSubscriptionStatus() {
      try {
        if (!sessionId) return;
        
        setLoading(true);
        console.log('セッションID確認中:', sessionId);
        
        // セッション情報を取得
        const { data: sessionData, error: sessionError } = await supabaseBrowser.auth.getSession();
        
        if (sessionError || !sessionData.session?.user) {
          console.error('認証エラー:', sessionError);
          return;
        }
        
        const userId = sessionData.session.user.id;
        console.log('ユーザーID:', userId);
        
        // サブスクリプション情報を取得
        const { data: subData, error: subError } = await supabaseBrowser
          .from('stripe_user_subscriptions')
          .select('*')
          .eq('userId', userId)
          .maybeSingle();
        
        if (subError) {
          console.error('サブスクリプション取得エラー:', subError);
        } else if (subData) {
          console.log('サブスクリプション情報:', subData);
          setSubscriptionStatus(subData.status || 'unknown');
        } else {
          console.log('サブスクリプション情報なし');
          setSubscriptionStatus('not_found');
        }
      } catch (error) {
        console.error('ステータス確認エラー:', error);
      } finally {
        setLoading(false);
      }
    }
    
    checkSubscriptionStatus();

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
  }, [router, sessionId]);

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
          
          {/* サブスクリプションステータスの表示 */}
          <div className="w-full p-4 bg-gray-50 rounded-md">
            <h2 className="font-medium mb-2">サブスクリプションステータス</h2>
            {loading ? (
              <p className="text-sm text-gray-500">データ取得中...</p>
            ) : subscriptionStatus ? (
              <p className={`text-sm ${
                subscriptionStatus === 'active' ? 'text-green-600' : 
                subscriptionStatus === 'not_found' ? 'text-red-600' : 
                'text-yellow-600'
              }`}>
                {subscriptionStatus === 'active' ? '有効' : 
                 subscriptionStatus === 'not_found' ? '見つかりません' : 
                 subscriptionStatus}
              </p>
            ) : (
              <p className="text-sm text-yellow-600">ステータス不明</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              ※ステータスがすぐに反映されない場合があります。ダッシュボードで再確認してください。
            </p>
          </div>
          
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