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

  const handlePurchase = async (priceId: string, mode: 'payment' | 'subscription') => {
    try {
      // ユーザーIDの検証と、未ログイン時は処理を中止
      if (!user?.id) {
        console.error('ユーザーIDがありません。ログインが必要です。');
        alert('ログインが必要です');
        return;
      }
      
      const userId = user.id;

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
      alert('決済処理の開始に失敗しました。もう一度お試しください。');
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