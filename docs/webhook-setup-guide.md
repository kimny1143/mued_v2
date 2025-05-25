# Stripe Webhook セットアップガイド

## 1. Webhook設定の手順

### Stripeダッシュボードでの設定

1. [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks) にアクセス
2. 「Add endpoint」をクリック
3. エンドポイントURLを設定:
   ```
   https://YOUR_DOMAIN/api/webhooks/stripe?x-vercel-protection-bypass=YOUR_SECRET_TOKEN
   ```
4. 以下のイベントを選択:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. 「Add endpoint」をクリックして保存

### 環境変数の設定

Vercelダッシュボードで以下の環境変数を設定:

```env
# Stripe関連
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Vercel Protection Bypass
VERCEL_AUTOMATION_BYPASS_SECRET=your-secret-token

# Supabase関連
DATABASE_URL=your-database-url
DIRECT_DATABASE_URL=your-direct-database-url
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 2. Webhook動作確認

### ローカルテスト（Stripe CLI使用）

```bash
# Stripe CLIインストール
brew install stripe/stripe-cli/stripe

# ログイン
stripe login

# Webhookの転送開始
stripe listen --forward-to localhost:3000/api/webhooks/stripe?x-vercel-protection-bypass=your-secret-token

# テストイベントの送信
stripe trigger checkout.session.completed
```

### 本番環境での確認

1. Stripeダッシュボードの「Webhooks」ページで送信履歴を確認
2. Vercelのファンクションログで処理結果を確認:
   ```bash
   vercel logs --filter api/webhooks/stripe
   ```

## 3. トラブルシューティング

### よくある問題と解決方法

1. **401 Unauthorized エラー**
   - Protection Bypassトークンが正しいか確認
   - URLのクエリパラメータに正しくトークンが含まれているか確認

2. **400 Bad Request エラー**
   - Webhook Secretが正しく設定されているか確認
   - Stripeダッシュボードのエンドポイント設定を確認

3. **データベース更新エラー**
   - `stripe_customers`テーブルと`stripe_user_subscriptions`テーブルが存在するか確認
   - Supabaseの権限設定を確認

### デバッグ用SQLクエリ

```sql
-- ユーザーのサブスクリプション状態を確認
SELECT 
    sus.*,
    sc.customerId
FROM stripe_user_subscriptions sus
LEFT JOIN stripe_customers sc ON sus.userId = sc.userId
WHERE sus.userId = 'YOUR_USER_ID';

-- 最近のWebhook処理を確認（ログテーブルがある場合）
SELECT * FROM webhook_events 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

## 4. セキュリティベストプラクティス

1. **環境変数の管理**
   - 本番環境と開発環境で異なるキーを使用
   - 定期的にキーをローテーション

2. **エラーハンドリング**
   - エラーでも200レスポンスを返してStripeの再送信を防ぐ
   - エラーログを詳細に記録

3. **冪等性の確保**
   - 同じイベントが複数回処理されても問題ないように設計
   - `subscriptionId`をユニークキーとして使用

## 5. 参考リンク

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Vercel Protection Bypass](https://vercel.com/docs/security/deployment-protection#protection-bypass)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security) 