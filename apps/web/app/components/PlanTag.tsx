"use client";

import { useState } from 'react';
import { useUser } from '@/lib/hooks/use-user';
import { Crown, Star, Zap, CreditCard, ExternalLink, Shield, UserCheck } from 'lucide-react';

export function PlanTag() {
  const { user, loading } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  if (loading || !user) {
    return (
      <div className="bg-gray-100 text-gray-400 px-2 py-1 rounded-full text-xs animate-pulse">
        Loading...
      </div>
    );
  }

  const userRole = user.role_id || 'student';

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

  // デフォルトはFREEプラン
  const planName = user.plan || 'FREE';

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

  // プラン管理へのリダイレクト処理
  const handlePlanClick = async () => {
    try {
      setIsLoading(true);

      // 学生の場合のみプラン管理を表示
      if (userRole === 'student') {
        window.location.href = '/dashboard/plans';
      }

    } catch (error) {
      console.error('プラン管理エラー:', error);
      alert('プラン管理の開始に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handlePlanClick}
      disabled={isLoading || userRole !== 'student'}
      className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer group active:scale-95 ${className} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={`${planName}プラン${userRole === 'student' ? ' - クリックしてプラン管理' : ''}`}
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
          {userRole === 'student' && <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />}
        </>
      )}
    </button>
  );
}