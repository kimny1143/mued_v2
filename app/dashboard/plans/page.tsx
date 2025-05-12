'use client';

import { Button } from "@ui/button";
import { Card } from "@ui/card";
import { CheckIcon } from "lucide-react";
import { products, StripeProduct } from "@/app/stripe-config";
import { useUser } from "@/lib/hooks/use-user";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";

export default function Page() {
  const { user, loading, error, isAuthenticated, session, subscription } = useUser();
  const [debugLog, setDebugLog] = useState<string[]>([]);

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

  // デバッグログを追加する関数
  const addDebugLog = (message: string, data?: unknown) => {
    const logEntry = `${new Date().toISOString()} - ${message} ${data ? JSON.stringify(data) : ''}`;
    console.log(logEntry); // 通常のコンソールにも出力
    
    setDebugLog(prev => {
      // 最新の20件だけ保持
      const newLogs = [...prev, logEntry].slice(-20);
      // ローカルストレージに保存
      try {
        localStorage.setItem('stripe_debug_logs', JSON.stringify(newLogs));
      } catch (e) {
        console.error('ログ保存エラー:', e);
      }
      return newLogs;
    });
  };

  const handlePurchase = async (priceId: string, mode: 'payment' | 'subscription') => {
    // 処理開始時のログ
    addDebugLog('購入処理開始', { priceId, mode });
    
    try {
      // ユーザーIDの検証と、未ログイン時は処理を中止
      if (!user?.id) {
        const errMsg = 'ユーザーIDがありません。ログインが必要です。';
        addDebugLog('エラー', errMsg);
        alert('ログインが必要です');
        return;
      }
      
      const userId = user.id;
      
      // APIリクエスト前のデータをログに記録
      const requestInfo = {
        origin: window.location.origin,
        host: window.location.host,
        priceId,
        mode,
        userId
      };
      addDebugLog('API呼び出し前', requestInfo);

      // APIエンドポイントを呼び出し
      addDebugLog('fetchリクエスト開始');
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          mode,
          successUrl: `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/dashboard/plans`,
          userId
        }),
        credentials: 'include', // クッキーを必ず送信
      });

      // レスポンスのステータスとヘッダーをログに記録
      const responseInfo = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers),
      };
      addDebugLog('APIレスポンス受信', responseInfo);

      if (!response.ok) {
        // エラーレスポンスの詳細を取得
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText };
        }
        
        addDebugLog('APIエラーレスポンス', errorData);
        throw new Error(errorData.error || '決済処理中にエラーが発生しました');
      }
      
      const data = await response.json();
      addDebugLog('APIレスポンスデータ', data);
      
      if (!data.url) {
        throw new Error('決済URLが返されませんでした');
      }
      
      // 決済ページへのリダイレクト前にログ
      addDebugLog('決済ページへリダイレクト', { url: data.url });
      
      // リダイレクト前に少し待機して、ログが確実に記録されるようにする
      setTimeout(() => {
        // 決済ページにリダイレクト
        window.location.href = data.url;
      }, 500);
    } catch (error) {
      // エラー詳細をログに記録
      const errorDetail = error instanceof Error ? error.message : '未知のエラー';
      addDebugLog('決済処理エラー', errorDetail);
      
      // エラー情報を表示
      alert(`決済処理の開始に失敗しました。エラー: ${errorDetail}`);
    }
  };

  // Filter subscription plans and sort them in the desired order
  const subscriptionPlans = products
    .filter((product: StripeProduct) => product.mode === 'subscription')
    .sort((a: StripeProduct, b: StripeProduct) => {
      const order = {
        'Basic Subscription': 1,
        'Starter Subscription': 2,
        'Premium Subscription': 3
      };
      return order[a.name as keyof typeof order] - order[b.name as keyof typeof order];
    });

  const features = {
    'Basic Subscription': [
      'Limited course access',
      'Email support',
      'Learning resources',
      'Basic tools',
      'Progress tracking'
    ],
    'Starter Subscription': [
      'Access to basic courses',
      'Standard support',
      'Community access',
      'Basic learning tools',
      'Monthly progress report'
    ],
    'Premium Subscription': [
      'Unlimited access to all courses',
      'Priority support',
      'Live group sessions',
      'Advanced learning tools',
      'Progress tracking'
    ]
  };

  return (
    <>
      {/* ページタイトル */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Choose Your Plan</h1>
      </div>

      {/* デバッグパネル (開発環境のみ表示) */}
      {process.env.NODE_ENV !== 'production' && debugLog.length > 0 && (
        <div className="mb-8 p-4 border border-orange-300 bg-orange-50 rounded-md overflow-auto max-h-60">
          <h3 className="font-bold mb-2">デバッグログ:</h3>
          <ul className="text-xs font-mono">
            {debugLog.map((log, i) => (
              <li key={i} className="mb-1">{log}</li>
            ))}
          </ul>
          <button 
            className="mt-2 text-xs text-red-500"
            onClick={() => {
              localStorage.removeItem('stripe_debug_logs');
              setDebugLog([]);
            }}
          >
            ログをクリア
          </button>
        </div>
      )}

      <div className="text-center mb-12">
        <p className="text-gray-600 text-lg">
          Select the perfect subscription to enhance your musical journey
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {subscriptionPlans.map((product: StripeProduct) => {
          const isStarterPlan = product.name === 'Starter Subscription';
          return (
            <Card 
              key={product.id} 
              className={`flex flex-col p-6 relative transform transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                isStarterPlan 
                  ? 'border-2 border-blue-500 shadow-lg' 
                  : 'hover:border-gray-300'
              }`}
            >
              {isStarterPlan && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Recommended
                </div>
              )}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">{product.name}</h3>
                <p className="text-gray-600 mb-4">{product.description}</p>
                <div className="text-3xl font-bold">
                  {product.priceId === 'price_1RMJdXRYtspYtD2zESbuO5mG' && '$60/mo'}
                  {product.priceId === 'price_1RMJcpRYtspYtD2zQjRRmLXc' && '$20/mo'}
                  {product.priceId === 'price_1RMJc0RYtspYtD2zcfoCAsph' && '$10/mo'}
                </div>
              </div>

              <div className="flex-grow">
                <ul className="space-y-3 mb-8">
                  {features[product.name as keyof typeof features].map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                className={`w-full ${isStarterPlan ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                onClick={() => handlePurchase(product.priceId, product.mode)}
              >
                Get Started
              </Button>
            </Card>
          );
        })}
      </div>
    </>
  );
}