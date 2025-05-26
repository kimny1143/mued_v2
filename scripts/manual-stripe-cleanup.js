#!/usr/bin/env node

/**
 * Stripeの失敗したPayment Intentを手動でキャンセルするスクリプト
 */

const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-03-31.basil',
});

// 失敗したPayment Intent IDのリスト（スクリプト実行結果から取得）
const failedPaymentIntentIds = [
  'pi_3RStoYRYtspYtD2z18nCxP7k',
  'pi_3RSuy4RYtspYtD2z0y4Z6BPZ', 
  'pi_3RSvXkRYtspYtD2z1q9XBhAh'
];

async function cancelFailedPaymentIntents() {
  console.log('🧹 Stripeの失敗したPayment Intentをキャンセル中...\n');

  for (const paymentIntentId of failedPaymentIntentIds) {
    try {
      // Payment Intentの現在の状態を確認
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      console.log(`📋 ${paymentIntentId}: ${paymentIntent.status}`);

      if (paymentIntent.status === 'requires_payment_method') {
        // キャンセル実行
        const canceledPaymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
        console.log(`✅ ${paymentIntentId}: キャンセル完了 (${canceledPaymentIntent.status})`);
      } else {
        console.log(`ℹ️  ${paymentIntentId}: キャンセル不要 (${paymentIntent.status})`);
      }
    } catch (error) {
      console.log(`❌ ${paymentIntentId}: エラー - ${error.message}`);
    }
    
    console.log('');
  }

  console.log('🎉 Stripe Payment Intentのクリーンアップ完了');
}

// スクリプト実行
cancelFailedPaymentIntents().catch(console.error); 