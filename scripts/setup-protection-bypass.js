console.log(`
🔐 Vercel Protection Bypass 設定ガイド
=====================================

StripeのWebhookはカスタムヘッダーを送信できないため、
以下のいずれかの方法で対応する必要があります：

方法1: クエリパラメータを使用（推奨）
--------------------------------------
1. Vercelダッシュボードで Protection Bypass for Automation を有効化
2. 生成されたシークレットをコピー
3. StripeのWebhook URLを以下のように変更：

   現在: https://dev.mued.jp/api/webhooks/stripe
   変更後: https://dev.mued.jp/api/webhooks/stripe?x-vercel-protection-bypass=YOUR_SECRET

方法2: Webhookプロキシを使用
----------------------------
1. Cloudflare Workers や AWS Lambda でプロキシを作成
2. プロキシがStripeからリクエストを受け取る
3. プロキシが x-vercel-protection-bypass ヘッダーを追加
4. Vercelにリクエストを転送

方法3: Vercelの認証保護を一時的に無効化
---------------------------------------
1. Vercelダッシュボード → Settings → Security
2. "Deployment Protection" を一時的に無効化
3. ただし、セキュリティリスクがあるため非推奨

推奨: 方法1を使用してください。
`);

// 環境変数の確認
if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
  console.log('\n✅ VERCEL_AUTOMATION_BYPASS_SECRET が設定されています');
  console.log('シークレットの最初の5文字:', process.env.VERCEL_AUTOMATION_BYPASS_SECRET.substring(0, 5) + '...');
} else {
  console.log('\n⚠️  VERCEL_AUTOMATION_BYPASS_SECRET が設定されていません');
  console.log('Vercelダッシュボードで Protection Bypass を有効化してください');
} 