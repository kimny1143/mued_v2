"use client";

import { useUser } from '@/lib/hooks/use-user';
import { getPlanByPriceId } from '@/app/stripe-config';
import { Crown, Star, Zap, CreditCard } from 'lucide-react';

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
          className: "bg-gradient-to-r from-purple-500 to-purple-600 text-white"
        };
      case 'PRO':
        return {
          icon: <Star className="w-3 h-3" />,
          className: "bg-gradient-to-r from-green-500 to-green-600 text-white"
        };
      case 'Starter':
        return {
          icon: <Zap className="w-3 h-3" />,
          className: "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
        };
      default:
        return {
          icon: <CreditCard className="w-3 h-3" />,
          className: "bg-gray-100 text-gray-600"
        };
    }
  };

  const { icon, className } = getPlanStyle();

  return (
    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      {icon}
      <span>{planName}プラン</span>
    </div>
  );
} 