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
    const key = process.env.STRIPE_PUBLIC_KEY;
    console.log('Stripe公開キー取得状態:', {
      hasKey: !!key,
      keyPrefix: key ? key.substring(0, 10) + '...' : 'なし'
    });

    if (!key) {
      console.error('Stripe公開キーが設定されていません。環境変数STRIPE_PUBLIC_KEYを確認してください。');
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
    
    // 環境情報をログに記録
    console.log('Stripe環境情報:', {
      env: process.env.NODE_ENV,
      publicKey: process.env.STRIPE_PUBLIC_KEY ? '設定済み' : '未設定',
      url: window.location.href,
      host: window.location.host
    });
    
    // Stripeクライアントの取得
    const stripe = await getStripe();
    if (!stripe) {
      throw new Error('Stripeの初期化に失敗しました');
    }

    // 修正: 価格IDにprice_で始まらないIDが指定された場合は、自動的にprice_を追加
    const formattedPriceId = priceId.startsWith('price_') ? priceId : `price_${priceId}`;
    console.log('処理する価格ID:', { 元のID: priceId, 修正後ID: formattedPriceId });

    // チェックアウトセッションを作成
    const { error } = await stripe.redirectToCheckout({
      mode,
      lineItems: [{ price: formattedPriceId, quantity: 1 }],
      successUrl,
      cancelUrl,
      clientReferenceId: userId,
    });

    if (error) {
      console.error('Stripeチェックアウトエラー:', error);
      // エラー詳細を展開してログ
      console.error('エラー詳細:', {
        message: error.message,
        type: typeof error,
        code: 'code' in error ? error.code : '不明',
        docURL: 'doc_url' in error ? error.doc_url : '不明',
      });
      throw new Error(error.message || 'チェックアウトに失敗しました');
    }
  } catch (err) {
    console.error('Stripeチェックアウト処理エラー:', err);
    // エラーオブジェクトの詳細をログ
    if (err instanceof Error) {
      console.error('エラー詳細:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
      });
    }
    throw err;
  }
};
