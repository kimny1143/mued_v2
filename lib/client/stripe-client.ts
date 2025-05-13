'use client';

import { loadStripe, Stripe } from '@stripe/stripe-js';

// Stripeインスタンスのキャッシュ
let stripePromise: Promise<Stripe | null>;

/**
 * Stripeクライアントインスタンスを取得する
 * @returns Stripeインスタンスのプロミス
 */
export const getStripe = () => {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    console.log('Stripe公開キー取得状態:', {
      hasKey: !!key,
      keyPrefix: key ? key.substring(0, 10) + '...' : 'なし'
    });

    if (!key) {
      console.error('Stripe公開キーが設定されていません。環境変数NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEYを確認してください。');
      return Promise.resolve(null);
    }

    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

/**
 * Stripeチェックアウトページにリダイレクトする
 */
export const redirectToCheckout = async ({
  priceId,
  mode = 'subscription',
  successUrl,
  cancelUrl,
  userId,
}: {
  priceId: string;
  mode: 'payment' | 'subscription';
  successUrl: string;
  cancelUrl: string;
  userId: string;
}) => {
  try {
    console.log('Stripeチェックアウト開始:', { priceId, mode });
    
    // Stripeクライアントの取得
    const stripe = await getStripe();
    if (!stripe) {
      throw new Error('Stripeの初期化に失敗しました');
    }

    // チェックアウトセッションを作成
    const { error } = await stripe.redirectToCheckout({
      mode,
      lineItems: [{ price: priceId, quantity: 1 }],
      successUrl,
      cancelUrl,
      clientReferenceId: userId,
    });

    if (error) {
      console.error('Stripeチェックアウトエラー:', error);
      throw new Error(error.message || 'チェックアウトに失敗しました');
    }
  } catch (err) {
    console.error('Stripeチェックアウト処理エラー:', err);
    throw err;
  }
};
