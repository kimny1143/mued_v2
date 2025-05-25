'use client';

export const dynamic = 'force-dynamic';

import { Button } from "@ui/button";
import { Card } from "@ui/card";
import { CheckIcon, Star } from "lucide-react";
import { getSubscriptionPlans, StripeProduct } from "@/app/stripe-config";
import { useUser } from "@/lib/hooks/use-user";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  const { user, loading, error, isAuthenticated, session, subscription } = useUser();
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [permissionError, setPermissionError] = useState<boolean>(false);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  // ローカルストレージからデバッグログを読み込む
  useEffect(() => {
    try {
      const storedLogs = localStorage.getItem('stripe_debug_logs');
      if (storedLogs) {
        setDebugLog(JSON.parse(storedLogs));
      }
    } catch (e) {
      console.error('ログ読み込みエラー:', e);
    }
  }, []);

  // Supabaseの権限エラーを検出
  useEffect(() => {
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = String(error.message);
      if (errorMessage.includes('permission denied') || errorMessage.includes('42501')) {
        setPermissionError(true);
        addDebugLog('Supabase権限エラーを検出', errorMessage);
      }
    }
  }, [error]);

  // デバッグログを追加する関数
  const addDebugLog = (message: string, data?: unknown) => {
    const logEntry = `${new Date().toISOString()} - ${message} ${data ? JSON.stringify(data) : ''}`;
    console.log(logEntry);
    
    setDebugLog(prev => {
      const newLogs = [...prev, logEntry].slice(-20);
      try {
        localStorage.setItem('stripe_debug_logs', JSON.stringify(newLogs));
      } catch (e) {
        console.error('ログ保存エラー:', e);
      }
      return newLogs;
    });
  };

  const handlePurchase = async (priceId: string, planName: string) => {
    addDebugLog('購入処理開始', { priceId, planName });
    
    // 既に処理中の場合は重複実行を防ぐ
    if (processingPlan) {
      addDebugLog('重複実行防止', { 処理中プラン: processingPlan });
      return;
    }
    
    setProcessingPlan(planName);
    
    try {
      // FREEプランの場合は特別処理
      if (priceId === 'free') {
        addDebugLog('FREEプラン選択');
        router.push('/dashboard');
        return;
      }

      // 認証状態の詳細チェック
      if (!isAuthenticated || !user || !session) {
        addDebugLog('認証エラー', { 
          isAuthenticated, 
          hasUser: !!user, 
          hasSession: !!session 
        });
        
        // ログインページにリダイレクト
        const loginUrl = `/auth/signin?callbackUrl=${encodeURIComponent(window.location.href)}`;
        window.location.href = loginUrl;
        return;
      }

      // 環境情報をログに記録
      addDebugLog('環境情報', {
        nodeEnv: process.env.NODE_ENV,
        vercel: process.env.NEXT_PUBLIC_VERCEL_ENV || '不明',
        userId: user.id,
        userEmail: user.email
      });

      // リダイレクトURL設定
      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/dashboard/plans`;
      
      addDebugLog('新しいサブスクリプションAPI呼び出し開始', {
        successUrl,
        cancelUrl
      });
      
      // 新しいサブスクリプションAPIを呼び出し
      const response = await fetch('/api/subscription-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          successUrl,
          cancelUrl,
          userId: user.id
        }),
        credentials: 'include',
      });

      const responseInfo = {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      };
      addDebugLog('APIレスポンス受信', responseInfo);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText };
        }
        
        addDebugLog('APIエラーレスポンス', errorData);
        
        // 具体的なエラーメッセージを表示
        const errorMessage = errorData.error || `HTTP ${response.status}: 決済処理中にエラーが発生しました`;
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      addDebugLog('APIレスポンスデータ', data);
      
      if (data.redirectUrl) {
        // FREEプランの場合の処理
        addDebugLog('FREEプランリダイレクト', { url: data.redirectUrl });
        router.push(data.redirectUrl);
      } else if (data.url) {
        // 有料プランの場合の処理
        addDebugLog('決済ページへリダイレクト', { 
          url: data.url,
          sessionId: data.sessionId 
        });
        
        // Stripeの決済ページにリダイレクト
        window.location.href = data.url;
      } else {
        throw new Error('決済URLが返されませんでした。APIレスポンスを確認してください。');
      }

    } catch (error) {
      const errorDetail = error instanceof Error ? error.message : '未知のエラー';
      addDebugLog('決済処理エラー', errorDetail);
      
      // より詳細なエラーメッセージを表示
      let userMessage = '申し訳ございません。決済処理の開始に失敗しました。';
      
      if (errorDetail.includes('Price ID')) {
        userMessage += '\n価格設定に問題があります。管理者にお問い合わせください。';
      } else if (errorDetail.includes('Authentication')) {
        userMessage += '\n認証に問題があります。再度ログインしてお試しください。';
      } else if (errorDetail.includes('Network')) {
        userMessage += '\nネットワークエラーが発生しました。接続を確認してお試しください。';
      } else {
        userMessage += `\n詳細: ${errorDetail}`;
      }
      
      alert(userMessage);
    } finally {
      setProcessingPlan(null);
    }
  };

  // プランを取得（新しい設定から）
  const subscriptionPlans = getSubscriptionPlans();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">料金プラン</h1>
            <div className="text-sm text-gray-500">
              あなたのペースで、あなたのスタイルで
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* 権限エラー通知 */}
        {permissionError && (
          <div className="mb-6 p-4 border border-yellow-400 bg-yellow-50 rounded-lg">
            <h3 className="font-bold text-yellow-800">Supabase権限エラーが発生しています</h3>
            <p className="text-sm text-yellow-700">
              データベース権限の問題が検出されましたが、決済機能はテストモードで利用できます。
            </p>
          </div>
        )}

        {/* デバッグパネル (開発環境のみ表示) */}
        {process.env.NODE_ENV !== 'production' && debugLog.length > 0 && (
          <div className="mb-8 p-4 border border-orange-300 bg-orange-50 rounded-lg overflow-auto max-h-60">
            <h3 className="font-bold mb-2">デバッグログ:</h3>
            <ul className="text-xs font-mono">
              {debugLog.map((log, i) => (
                <li key={i} className="mb-1">{log}</li>
              ))}
            </ul>
            <button 
              className="mt-2 text-xs text-red-500 hover:underline"
              onClick={() => {
                localStorage.removeItem('stripe_debug_logs');
                setDebugLog([]);
              }}
            >
              ログをクリア
            </button>
          </div>
        )}

        {/* プランカード */}
        <div className="grid md:grid-cols-4 gap-8">
          {subscriptionPlans.map((plan: StripeProduct, index) => (
            <Card 
              key={plan.id} 
              className={`relative rounded-2xl overflow-hidden transform transition-all duration-500 hover:scale-105 ${
                plan.recommended 
                  ? 'border-2 border-green-500 scale-105 shadow-2xl shadow-green-500/20' 
                  : 'border border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* おすすめバッジ */}
              {plan.recommended && (
                <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center">
                  <Star className="w-3 h-3 mr-1" />
                  MOST POPULAR
                </div>
              )}

              <div className={`p-8 ${plan.recommended ? 'bg-gradient-to-br from-green-600 to-green-700 text-white' : 'bg-white'}`}>
                {/* プラン名と価格 */}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className={`mb-4 ${plan.recommended ? 'text-green-100' : 'text-gray-600'}`}>
                    {plan.description}
                  </p>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold">¥{plan.price.toLocaleString()}</span>
                    <span className={`ml-2 ${plan.recommended ? 'text-green-200' : 'text-gray-400'}`}>
                      {plan.price === 0 ? '' : '/月'}
                    </span>
                  </div>
                </div>

                {/* 機能リスト */}
                <div className="mb-8">
                  <ul className="space-y-4">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-start">
                        <CheckIcon className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${
                          plan.recommended ? 'text-green-200' : 'text-green-500'
                        }`} />
                        <span className={plan.recommended ? 'text-green-100' : 'text-gray-700'}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA ボタン */}
                <Button
                  className={`w-full py-3 rounded-full font-semibold transition transform hover:scale-105 ${
                    plan.recommended 
                      ? 'bg-white text-green-600 hover:bg-gray-100 shadow-lg' 
                      : plan.price === 0
                        ? 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        : 'bg-green-500 text-white hover:bg-green-600'
                  } ${processingPlan === plan.name ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => handlePurchase(plan.priceId, plan.name)}
                  disabled={processingPlan !== null}
                >
                  {processingPlan === plan.name ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      処理中...
                    </div>
                  ) : processingPlan ? (
                    plan.price === 0 ? '無料で始める' : 'プランを選択'
                  ) : (
                    plan.price === 0 ? '無料で始める' : 'プランを選択'
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* フッター情報 */}
        <div className="text-center mt-12">
          <p className="text-gray-500">
            すべてのプランに14日間の無料トライアル付き。いつでもキャンセル可能。
          </p>
          <div className="mt-4 flex justify-center space-x-6 text-sm text-gray-400">
            <span>✓ セキュアな決済</span>
            <span>✓ 即座にアクセス</span>
            <span>✓ サポート対応</span>
          </div>
        </div>
      </div>
    </div>
  );
}