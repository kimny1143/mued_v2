"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { products } from '../stripe-config';

interface Subscription {
  price_id: string | null;
  subscription_status: string;
  current_period_end: number | null;
}

export function SubscriptionStatus() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const { data, error } = await supabase
          .from('stripe_user_subscriptions')
          .select('price_id, subscription_status, current_period_end')
          .maybeSingle();

        if (error) throw error;

        setSubscription(data);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, []);

  if (loading) return <div className="text-xs py-3">Loading subscription status...</div>;
  if (error) return <div className="text-xs text-red-500 py-3">Error loading subscription: {error}</div>;
  if (!subscription) return <div className="p-3 bg-white rounded-lg shadow-sm text-xs">No active subscription</div>;

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
      </div>
    </div>
  );
}