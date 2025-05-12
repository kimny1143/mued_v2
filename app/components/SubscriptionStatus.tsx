"use client";

import React from 'react';
import { products } from '../stripe-config';
import { useSubscription } from '@/lib/hooks/use-subscription';

export function SubscriptionStatus() {
  const { subscription, loading, error } = useSubscription();

  // ローディング中表示
  if (loading) {
    return (
      <div className="p-3 bg-white rounded-lg shadow-sm animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  // サブスクリプションがない場合
  if (!subscription || subscription.status !== 'active') {
    return (
      <div className="p-3 bg-white rounded-lg shadow-sm">
        <h3 className="text-sm font-bold mb-2 text-gray-700">Subscription Status</h3>
        <div className="space-y-1.5">
          <p className="text-xs">
            <span className="text-gray-500">Plan:</span> Free Plan
          </p>
          <p className="text-xs">
            <span className="text-gray-500">Status:</span> Inactive
          </p>
          <p className="text-xs text-gray-600 mt-1">
            No active subscription
          </p>
        </div>
      </div>
    );
  }

  // アクティブなサブスクリプションの表示
  const product = products.find(p => p.priceId === subscription.priceId);

  return (
    <div className="p-3 bg-white rounded-lg shadow-sm">
      <h3 className="text-sm font-bold mb-2 text-gray-700">Subscription Status</h3>
      <div className="space-y-1.5">
        <p className="text-xs">
          <span className="text-gray-500">Plan:</span> {product?.name || 'Custom Plan'}
        </p>
        <p className="text-xs">
          <span className="text-gray-500">Status:</span> {subscription.status}
        </p>
        {subscription.currentPeriodEnd && (
          <p className="text-xs">
            <span className="text-gray-500">Next billing date:</span>{' '}
            {new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString()}
          </p>
        )}
        <p className="text-xs text-green-600 mt-1">
          <span className="font-bold">Active</span>
        </p>
      </div>
    </div>
  );
}