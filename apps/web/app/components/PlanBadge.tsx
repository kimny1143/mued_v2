'use client';

import React from 'react';

import { useUser } from '@/lib/hooks/use-user';

// プラン名に応じた色を定義
const planColors: Record<string, string> = {
  'Free Plan': 'bg-gray-200 text-gray-800',
  'Basic Subscription': 'bg-blue-100 text-blue-800',
  'Starter Subscription': 'bg-indigo-100 text-indigo-800',
  'Premium Subscription': 'bg-purple-100 text-purple-800',
  'Premium Plan': 'bg-purple-100 text-purple-800', // 代替名
};

export function PlanBadge() {
  const { user, loading } = useUser();
  
  if (loading) {
    return <span className="inline-block h-6 w-16 bg-gray-100 rounded animate-pulse"></span>;
  }
  
  const planName = user?.plan || 'Free Plan';
  const colorClasses = planColors[planName] || 'bg-gray-200 text-gray-800';
  
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${colorClasses}`}>
      {planName}
    </span>
  );
} 