#!/usr/bin/env ts-node
/**
 * Stripe Webhookのローカルテスト用スクリプト
 * 
 * 使用方法:
 * 1. npmパッケージのインストール: npm install -g stripe-cli
 * 2. StripeにログイキN: stripe login
 * 3. このスクリプトを実行: ts-node scripts/test-stripe-webhook.ts
 * 
 * Stripe CLIは指定されたエンドポイントにイベントを転送します
 */

import { exec } from 'child_process';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// .env.localから環境変数をロード
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// コンフィギュレーション
const LOCAL_WEBHOOK_URL = process.env.STRIPE_WEBHOOK_LOCAL_URL || 'http://localhost:3000/api/webhooks/stripe';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  console.error('エラー: STRIPE_WEBHOOK_SECRETが設定されていません');
  process.exit(1);
}

console.log('Stripe Webhook転送の開始...');
console.log(`Webhookエンドポイント: ${LOCAL_WEBHOOK_URL}`);
console.log('Ctrl+Cで停止します');

// Stripe CLIでWebhookをリッスン
const stripeProcess = exec(`stripe listen --forward-to ${LOCAL_WEBHOOK_URL}`);

stripeProcess.stdout?.on('data', (data) => {
  console.log(`Stripe CLI: ${data}`);
});

stripeProcess.stderr?.on('data', (data) => {
  console.error(`Stripe CLI エラー: ${data}`);
});

stripeProcess.on('close', (code) => {
  console.log(`Stripe CLI プロセスが終了しました。コード: ${code}`);
});

// 以下のコマンドでイベントをトリガーする方法の表示
console.log('\n--- テストイベントの送信方法 ---');
console.log('別のターミナルウィンドウで以下を実行:');
console.log('checkout.session.completed イベントの送信:');
console.log('  stripe trigger checkout.session.completed');
console.log('\nサブスクリプション関連イベントの送信:');
console.log('  stripe trigger customer.subscription.created');
console.log('  stripe trigger customer.subscription.updated');
console.log('  stripe trigger customer.subscription.deleted');

// 終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('Stripe Webhook転送を停止します...');
  stripeProcess.kill();
  process.exit(0);
}); 