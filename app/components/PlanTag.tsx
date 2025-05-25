"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@/lib/hooks/use-user';
import { getPlanByPriceId } from '@/app/stripe-config';
import { Crown, Star, Zap, CreditCard, ExternalLink, Shield, UserCheck } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { extractRoleFromApiResponse } from '@/lib/role-utils';

export function PlanTag() {
  const { subscription, loading } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>('student');

  // ユーザーロールを取得
  useEffect(() => {
    const getUserRole = async () => {
      try {
        const { data } = await supabaseBrowser.auth.getSession();
        if (data.session?.user) {
          const response = await fetch(`/api/user?userId=${data.session.user.id}`);
          if (response.ok) {
            const userData = await response.json();
            
            // 新しいロールユーティリティを使用
            const finalRole = extractRoleFromApiResponse(userData);
            setUserRole(finalRole);
          }
        }
      } catch (error) {
        console.error('ロール取得エラー:', error);
      }
    };

    getUserRole();
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-100 text-gray-400 px-2 py-1 rounded-full text-xs animate-pulse">
        Loading...
      </div>
    );
  }

  // メンター・管理者の場合は専用の表示
  if (userRole === 'mentor') {
    return (
      <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-500/25">
        <UserCheck className="w-3 h-3" />
        <span>メンター</span>
      </div>
    );
  }

  if (userRole === 'admin') {
    return (
      <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-red-500 to-red-600 text-white shadow-red-500/25">
        <Shield className="w-3 h-3" />
        <span>管理者</span>
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
  const handlePlanClick = async () => {
    console.log('プランタグクリック - Billingポータルにリダイレクト');
    
    // FREEプランの場合は特別なメッセージを表示
    if (planName === 'FREE') {
      const shouldUpgrade = confirm('現在FREEプランをご利用中です。\nプランをアップグレードしますか？');
      if (!shouldUpgrade) return;
      
      // FREEプランの場合はランディングページにリダイレクト
      window.location.href = '/new-landing';
      return;
    }
    
    try {
      setIsLoading(true);

      // 認証トークンを取得
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('認証トークンが見つかりません。再度ログインしてください。');
      }

      // Billing Portal Sessionを作成
      const response = await fetch('/api/billing-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Billing Portal Sessionの作成に失敗しました');
      }

      // 新しいタブでBilling Portalを開く
      window.open(data.url, '_blank');

    } catch (error) {
      console.error('Billing Portal エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'Billing Portalの開始に失敗しました';
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handlePlanClick}
      disabled={isLoading}
      className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer group active:scale-95 ${className} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={`${planName}プラン - クリックしてプラン管理・変更`}
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-2.5 w-2.5 border-b border-current"></div>
          <span>処理中...</span>
        </>
      ) : (
        <>
          {icon}
          <span>{planName}プラン</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </>
      )}
    </button>
  );
} 