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
  const { user, loading, error, isAuthenticated, session } = useUser();
  const [authUser, setAuthUser] = useState<{ user: User | null } | null>(null);
  const [sessionInfo, setSessionInfo] = useState<{ session: Session | null } | null>(null);
  const [debugVisible, setDebugVisible] = useState(false);

  // デバッグ用ログ出力を追加
  useEffect(() => {
    console.log('認証状態:', { 
      isAuthenticated, 
      user, 
      loading, 
      error,
      session
    });

    // Supabase認証情報を取得
    async function getAuthInfo() {
      const { data: sessionData } = await supabase.auth.getSession();
      const { data: userData } = await supabase.auth.getUser();
      
      console.log('Supabase Session:', sessionData);
      console.log('Supabase User:', userData);
      
      setSessionInfo(sessionData);
      setAuthUser(userData);
    }
    
    getAuthInfo();
  }, [isAuthenticated, user, loading, error, session]);

  const handlePurchase = async (priceId: string, mode: 'payment' | 'subscription') => {
    try {
      // ユーザーIDがない場合でもテスト環境では一時的に処理を続行
      const userId = user?.id || 'test-user-' + Math.random().toString(36).substring(2, 9);
      
      console.log('決済処理を開始:', { priceId, mode, userId });

      // APIエンドポイントを呼び出し
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
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '決済処理中にエラーが発生しました');
      }
      
      // 決済ページにリダイレクト
      window.location.href = data.url || '';
    } catch (error) {
      console.error('Error creating checkout session:', error);
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
      {/* デバッグ情報 */}
      <div className="mb-8 p-4 border rounded bg-gray-50">
        <div className="flex justify-between mb-2">
          <h2 className="text-lg font-semibold">デバッグ情報</h2>
          <Button variant="outline" size="sm" onClick={() => setDebugVisible(!debugVisible)}>
            {debugVisible ? '隠す' : '表示'}
          </Button>
        </div>
        
        {debugVisible && (
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-medium">ユーザー情報:</h3>
              <pre className="p-2 bg-gray-100 rounded overflow-auto max-h-40">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium">認証情報:</h3>
              <pre className="p-2 bg-gray-100 rounded overflow-auto max-h-40">
                {JSON.stringify({
                  isAuthenticated,
                  loading,
                  error: error?.message
                }, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium">Supabase認証ユーザー:</h3>
              <pre className="p-2 bg-gray-100 rounded overflow-auto max-h-40">
                {JSON.stringify(authUser, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium">Supabaseセッション:</h3>
              <pre className="p-2 bg-gray-100 rounded overflow-auto max-h-40">
                {JSON.stringify(sessionInfo, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* ページタイトル */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Choose Your Plan</h1>
      </div>

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