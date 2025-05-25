"use client";

import { getPlanByPriceId } from '@/app/stripe-config';
import { useUser } from '@/lib/hooks/use-user';
import { Card } from '@ui/card';
import { Button } from '@ui/button';
import { Crown, Zap, Star, Settings, CreditCard } from 'lucide-react';
import Link from 'next/link';

export function SubscriptionStatus() {
  const { user, subscription, loading, error } = useUser();

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

  // プラン情報を取得（サブスクリプション情報から、またはFREEプランとして）
  const currentPlan = subscription?.priceId 
    ? getPlanByPriceId(subscription.priceId)
    : getPlanByPriceId('free'); // FREEプランを取得

  const isActive = subscription?.status === 'active' || subscription?.status === 'free';
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
      {/* エラー表示（権限エラーの場合のみ警告として表示） */}
      {error && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-4">
          <div className="flex items-center space-x-2 text-yellow-600">
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">設定情報</span>
          </div>
          <p className="text-xs text-yellow-700 mt-1">
            {error.includes('データベース権限') 
              ? 'データベース設定が完了していませんが、FREEプランとして動作しています。'
              : 'サブスクリプション情報の一部が制限されていますが、正常に動作しています。'
            }
          </p>
        </div>
      )}

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
                {isActive ? '有効' : subscription?.status || '未設定'}
              </div>
            </div>
            
            {subscription?.currentPeriodEnd && (
              <div>
                <span className="text-gray-600 text-sm">次回請求日:</span>
                <div className="font-semibold">
                  {new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString('ja-JP', {
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