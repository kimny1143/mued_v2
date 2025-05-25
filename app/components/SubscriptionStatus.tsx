"use client";

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { getPlanByPriceId, getSubscriptionPlans } from '@/app/stripe-config';
import { useUser } from '@/lib/hooks/use-user';
import { Card } from '@ui/card';
import { Button } from '@ui/button';
import { Crown, Zap, Star, Settings, CreditCard } from 'lucide-react';
import Link from 'next/link';

interface Subscription {
  price_id: string | null;
  subscription_status: string;
  current_period_end: number | null;
}

type SupabaseError = {
  message: string;
};

export function SubscriptionStatus() {
  const { user, subscription: userSubscription } = useUser();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        // use-userフックからサブスクリプション情報を取得
        if (userSubscription) {
          setSubscription({
            price_id: userSubscription.priceId ?? null,
            subscription_status: userSubscription.status,
            current_period_end: userSubscription.currentPeriodEnd ?? null
          });
        } else {
          // フォールバック: 直接データベースから取得
          const { data, error } = await supabaseBrowser
            .from('stripe_user_subscriptions')
            .select('price_id, subscription_status, current_period_end')
            .maybeSingle();

          if (error) throw error;
          setSubscription(data);
        }
      } catch (err: unknown) {
        const supabaseError = err as SupabaseError;
        setError(supabaseError.message);
        console.error('サブスクリプション情報取得エラー:', supabaseError);
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, [userSubscription]);

  if (loading) {
    return (
      <Card className="p-6 bg-white">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 bg-red-50 border-red-200">
        <div className="flex items-center space-x-2 text-red-600">
          <Settings className="w-5 h-5" />
          <span className="font-medium">エラー</span>
        </div>
        <p className="text-red-700 text-sm mt-2">
          サブスクリプション情報の読み込みに失敗しました: {error}
        </p>
        <Link href="/dashboard/plans">
          <Button className="mt-3 bg-red-600 hover:bg-red-700 text-white">
            プランページへ
          </Button>
        </Link>
      </Card>
    );
  }

  // プラン情報を取得
  const currentPlan = subscription?.price_id 
    ? getPlanByPriceId(subscription.price_id)
    : getPlanByPriceId('free'); // デフォルトでFREEプラン

  const isActive = subscription?.subscription_status === 'active';
  const planName = currentPlan?.name || 'FREE';
  const planPrice = currentPlan?.price || 0;

  // プランのアイコンを決定
  const getPlanIcon = () => {
    if (planName === 'Premium') return <Crown className="w-6 h-6 text-purple-500" />;
    if (planName === 'PRO') return <Star className="w-6 h-6 text-green-500" />;
    if (planName === 'Starter') return <Zap className="w-6 h-6 text-blue-500" />;
    return <CreditCard className="w-6 h-6 text-gray-500" />;
  };

  // プランのカラーテーマを決定
  const getPlanTheme = () => {
    if (planName === 'Premium') return 'from-purple-500 to-purple-600';
    if (planName === 'PRO') return 'from-green-500 to-green-600';
    if (planName === 'Starter') return 'from-blue-500 to-blue-600';
    return 'from-gray-400 to-gray-500';
  };

  return (
    <Card className="overflow-hidden">
      {/* ヘッダー部分 */}
      <div className={`bg-gradient-to-r ${getPlanTheme()} p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getPlanIcon()}
            <div>
              <h3 className="text-xl font-bold">{planName}プラン</h3>
              <p className="text-white/80 text-sm">
                {isActive ? 'アクティブ' : 'インアクティブ'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {planPrice === 0 ? '無料' : `¥${planPrice.toLocaleString()}`}
            </div>
            {planPrice > 0 && (
              <div className="text-white/80 text-sm">/月</div>
            )}
          </div>
        </div>
      </div>

      {/* 詳細情報 */}
      <div className="p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-gray-600 text-sm">ステータス:</span>
              <div className={`font-semibold ${
                isActive ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {isActive ? '有効' : subscription?.subscription_status || '未設定'}
              </div>
            </div>
            
            {subscription?.current_period_end && (
              <div>
                <span className="text-gray-600 text-sm">次回請求日:</span>
                <div className="font-semibold">
                  {new Date(subscription.current_period_end * 1000).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 機能一覧 */}
          {currentPlan?.features && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">現在のプラン機能</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {currentPlan.features.slice(0, 4).map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              {currentPlan.features.length > 4 && (
                <p className="text-sm text-gray-500 mt-2">
                  +{currentPlan.features.length - 4}つの機能
                </p>
              )}
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Link href="/dashboard/plans" className="flex-1">
              <Button 
                variant={planName === 'FREE' ? 'default' : 'outline'} 
                className="w-full"
              >
                {planName === 'FREE' ? 'プランをアップグレード' : 'プランを変更'}
              </Button>
            </Link>
            
            {isActive && planName !== 'FREE' && (
              <Link href="/dashboard/settings">
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>管理</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* フッター情報 */}
      {planName === 'FREE' && (
        <div className="bg-gray-50 px-6 py-4 border-t">
          <p className="text-sm text-gray-600 text-center">
            💡 PROプランで無制限のAI教材とレッスン予約を利用できます
          </p>
        </div>
      )}
    </Card>
  );
}