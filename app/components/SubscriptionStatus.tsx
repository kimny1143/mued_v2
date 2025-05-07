"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@lib/supabase';
import { products } from '@/stripe-config';

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

  if (loading) return <div>Loading subscription status...</div>;
  if (error) return <div>Error loading subscription: {error}</div>;
  if (!subscription) return <div>No active subscription</div>;

  const product = products.find(p => p.priceId === subscription.price_id);

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2">Subscription Status</h3>
      <div className="space-y-2">
        <p>Plan: {product?.name || 'No active plan'}</p>
        <p>Status: {subscription.subscription_status}</p>
        {subscription.current_period_end && (
          <p>
            Next billing date:{' '}
            {new Date(subscription.current_period_end * 1000).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}