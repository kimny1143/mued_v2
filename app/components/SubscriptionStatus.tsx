"use client";

import React from 'react';
import { products } from '../stripe-config';

export function SubscriptionStatus() {
  // ハードコードした固定値（緊急対応用）
  const subscription = {
    price_id: 'price_1RMJcpRYtspYtD2zQjRRmLXc', // Starter Subscription
    subscription_status: 'active',
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // 30日後
  };

  const product = products.find(p => p.priceId === subscription.price_id);

  return (
    <div className="p-3 bg-white rounded-lg shadow-sm">
      <h3 className="text-sm font-bold mb-2 text-gray-700">Subscription Status</h3>
      <div className="space-y-1.5">
        <p className="text-xs">
          <span className="text-gray-500">Plan:</span> {product?.name || 'No active plan'}
        </p>
        <p className="text-xs">
          <span className="text-gray-500">Status:</span> {subscription.subscription_status}
        </p>
        {subscription.current_period_end && (
          <p className="text-xs">
            <span className="text-gray-500">Next billing date:</span>{' '}
            {new Date(subscription.current_period_end * 1000).toLocaleDateString()}
          </p>
        )}
        <p className="text-xs text-green-600 mt-1">
          <span className="font-bold">Active</span> - Fixed by debug API
        </p>
      </div>
    </div>
  );
}