"use client";

import { useUser } from '@/lib/hooks/use-user';
import { getPlanByPriceId } from '@/app/stripe-config';
import { Crown, Star, Zap, CreditCard, ExternalLink } from 'lucide-react';
import { redirectToBillingPortal } from '@/lib/billing-utils';

export function PlanTag() {
  const { subscription, loading } = useUser();

  if (loading) {
    return (
      <div className="bg-gray-100 text-gray-400 px-2 py-1 rounded-full text-xs animate-pulse">
        Loading...
      </div>
    );
  }

  // プラン情報を取得
  const currentPlan = subscription?.priceId 
    ? getPlanByPriceId(subscription.priceId)
    : getPlanByPriceId('free');

  const planName = currentPlan?.name || 'FREE';

  // プランのアイコンとスタイルを決定
  const getPlanStyle = () => {
    switch (planName) {
      case 'Premium':
        return {
          icon: <Crown className="w-3 h-3" />,
          className: "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-purple-500/25"
        };
      case 'PRO':
        return {
          icon: <Star className="w-3 h-3" />,
          className: "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-green-500/25"
        };
      case 'Starter':
        return {
          icon: <Zap className="w-3 h-3" />,
          className: "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-blue-500/25"
        };
      default:
        return {
          icon: <CreditCard className="w-3 h-3" />,
          className: "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-700 shadow-gray-500/25"
        };
    }
  };

  const { icon, className } = getPlanStyle();

  // Billingポータルへのリダイレクト処理
  const handlePlanClick = () => {
    console.log('プランタグクリック - Billingポータルにリダイレクト');
    
    // FREEプランの場合は特別なメッセージを表示
    if (planName === 'FREE') {
      const shouldUpgrade = confirm('現在FREEプランをご利用中です。\nプランをアップグレードしますか？');
      if (!shouldUpgrade) return;
    }
    
    redirectToBillingPortal();
  };

  return (
    <button 
      onClick={handlePlanClick}
      className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer group active:scale-95 ${className}`}
      title={`${planName}プラン - クリックしてプラン管理・変更`}
    >
      {icon}
      <span>{planName}プラン</span>
      <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
    </button>
  );
} 