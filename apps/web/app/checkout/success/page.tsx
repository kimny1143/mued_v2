'use client';

import { CheckCircle, ArrowRight, Home, CreditCard } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

import { Button } from '@ui/button';

interface CheckoutSession {
  sessionId: string;
  status: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  metadata: Record<string, string>;
}

// useSearchParamsを使用するコンポーネントを分離
function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('セッションIDが見つかりません');
      setLoading(false);
      return;
    }

    // Stripe決済セッションの詳細を取得
    const fetchSessionDetails = async () => {
      try {
        const response = await fetch(`/api/checkout-session?sessionId=${sessionId}`);
        
        if (!response.ok) {
          throw new Error('セッション情報の取得に失敗しました');
        }
        
        const data = await response.json();
        setSession(data);
      } catch (err) {
        console.error('Session fetch error:', err);
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetails();
  }, [sessionId]);

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency.toUpperCase() === 'JPY' ? 'JPY' : 'USD',
    }).format(amount);
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">決済情報を確認中...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-red-100 p-6 rounded-lg">
            <div className="text-red-600 mb-4">
              <CreditCard className="w-12 h-12 mx-auto" />
            </div>
            <h1 className="text-xl font-bold text-red-800 mb-2">
              エラーが発生しました
            </h1>
            <p className="text-red-700 mb-4">
              {error || '決済情報を取得できませんでした'}
            </p>
            <Button 
              onClick={handleGoToDashboard}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              ダッシュボードに戻る
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const planName = session.metadata.planName || 'プラン';
  const isPaymentSuccessful = session.status === 'paid' || session.status === 'complete';

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          {isPaymentSuccessful ? (
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          ) : (
            <CreditCard className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
          )}
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {isPaymentSuccessful ? '決済が完了しました！' : '決済を処理中です'}
          </h1>
          
          <p className="text-xl text-gray-600">
            {isPaymentSuccessful 
              ? `${planName}にご登録いただき、ありがとうございます。` 
              : '決済の処理には少し時間がかかる場合があります。'
            }
          </p>
        </div>

        {/* 決済詳細カード */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">決済詳細</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">プラン:</span>
                  <span className="font-semibold">{planName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">金額:</span>
                  <span className="font-semibold text-green-600">
                    {formatAmount(session.amount, session.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ステータス:</span>
                  <span className={`font-semibold ${
                    isPaymentSuccessful ? 'text-green-600' : 'text-yellow-600'
              }`}>
                    {isPaymentSuccessful ? '完了' : '処理中'}
                  </span>
                </div>
                {session.customerEmail && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">メール:</span>
                    <span className="font-semibold">{session.customerEmail}</span>
                  </div>
                )}
              </div>
          </div>
          
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">次のステップ</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  確認メールを送信します
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  すぐにサービスをご利用いただけます
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  ダッシュボードで学習を開始
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={handleGoToDashboard}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg flex items-center justify-center"
          >
            <Home className="w-5 h-5 mr-2" />
            ダッシュボードへ
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          
          <Button 
            onClick={() => router.push('/new-landing')}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3 text-lg"
          >
            料金プランを見る
          </Button>
        </div>

        {/* サポート情報 */}
        <div className="text-center mt-12">
          <p className="text-gray-500 mb-2">
            ご質問やサポートが必要な場合は、お気軽にお問い合わせください。
          </p>
          <a 
            href="mailto:support@mued.jp" 
            className="text-green-600 hover:text-green-700 font-medium"
          >
            support@mued.jp
          </a>
        </div>
      </div>
    </div>
  );
}

// ローディング用のコンポーネント
function CheckoutSuccessLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
        <p className="text-gray-600">ページを読み込み中...</p>
      </div>
    </div>
  );
}

// メインのページコンポーネント
export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<CheckoutSuccessLoading />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
} 