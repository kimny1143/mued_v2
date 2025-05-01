import { supabase } from './supabase';

export async function createCheckoutSession(priceId: string, mode: 'payment' | 'subscription') {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('No session found');
    }

    // 環境変数に基づいてエンドポイントを選択
    const apiEndpoint = import.meta.env.PROD 
      ? `${import.meta.env.VITE_SUPABASE_URL_PROD}/functions/v1/stripe-checkout`
      : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`;

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        price_id: priceId,
        success_url: `${window.location.origin}/success`,
        cancel_url: `${window.location.origin}/cancel`,
        mode,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create checkout session');
    }

    const { url } = await response.json();
    return url;
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}