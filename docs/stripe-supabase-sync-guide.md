# Stripe → Supabase データ同期ガイド

## 概要

このガイドでは、Stripeの既存取引データをSupabaseに同期する方法を説明します。これにより、Billing Portal機能が正常に動作するようになります。

## 問題の背景

現在、以下の問題が発生しています：

1. **Stripeに既存の顧客・サブスクリプションデータが存在**
2. **Supabaseの`stripe_customers`、`stripe_user_subscriptions`テーブルが空**
3. **結果として、Billing Portal APIが「顧客が見つからない」エラーを返す**
4. **プランタグクリック時に`/dashboard/plans`にリダイレクトされる**

## 解決策

Stripeから既存データを取得し、Supabaseに同期することで問題を解決します。

## 実行手順

### 1. 環境変数の確認

以下の環境変数が設定されていることを確認してください：

```bash
# .env.local
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. 必要なパッケージのインストール

```bash
npm install stripe @supabase/supabase-js
```

### 3. 同期スクリプトの実行

```bash
npm run sync:stripe
```

### 4. 実行結果の確認

スクリプトが正常に実行されると、以下のような出力が表示されます：

```
🔄 Stripe → Supabase データ同期開始...

📋 Stripeから顧客データを取得中...
✅ 3件の顧客データを取得

👤 顧客処理中: cus_test_a2c17a51 (user@example.com)
  ✅ ユーザーID: 12345678-1234-1234-1234-123456789012
  ✅ 顧客データ同期完了
    💳 サブスクリプション: sub_test_123 (active)
    ✅ サブスクリプション同期完了

📊 同期結果確認...
✅ 同期完了!
  - 顧客レコード: 3件
  - サブスクリプションレコード: 2件

🔥 アクティブなサブスクリプション:
  - user@example.com: price_test_123 (active)

🎉 同期処理が正常に完了しました!
```

## 同期されるデータ

### stripe_customers テーブル
- `userId`: Supabaseユーザーの内部ID
- `customerId`: Stripe顧客ID
- `createdAt`: 顧客作成日時
- `updatedAt`: 最終更新日時

### stripe_user_subscriptions テーブル
- `userId`: Supabaseユーザーの内部ID
- `customerId`: Stripe顧客ID
- `subscriptionId`: StripeサブスクリプションID
- `priceId`: 価格ID
- `status`: サブスクリプション状態（active, canceled, etc.）
- `currentPeriodStart`: 現在の請求期間開始日
- `currentPeriodEnd`: 現在の請求期間終了日
- `cancelAtPeriodEnd`: 期間終了時にキャンセルするかどうか
- `createdAt`: サブスクリプション作成日時
- `updatedAt`: 最終更新日時

## 同期後の確認

### 1. Supabaseダッシュボードでの確認

Supabaseダッシュボードで以下のテーブルを確認：

```sql
-- 顧客データの確認
SELECT * FROM stripe_customers;

-- サブスクリプションデータの確認
SELECT * FROM stripe_user_subscriptions;

-- ユーザーとサブスクリプションの結合確認
SELECT 
  u.email,
  u.name,
  sc.customerId,
  sus.subscriptionId,
  sus.priceId,
  sus.status
FROM users u
LEFT JOIN stripe_customers sc ON u.id = sc.userId
LEFT JOIN stripe_user_subscriptions sus ON u.id = sus.userId
WHERE sus.status = 'active';
```

### 2. フロントエンドでの確認

1. **プランタグをクリック**
2. **Billing Portalに正常にリダイレクトされることを確認**
3. **プラン変更機能が動作することを確認**

## トラブルシューティング

### エラー: "ユーザーが見つかりません"

**原因**: Stripeの顧客メールアドレスとSupabaseのユーザーメールアドレスが一致しない

**解決策**:
1. Supabaseの`users`テーブルでメールアドレスを確認
2. Stripeダッシュボードで顧客のメールアドレスを確認
3. 必要に応じて手動で修正

### エラー: "権限エラー"

**原因**: `SUPABASE_SERVICE_ROLE_KEY`が正しく設定されていない

**解決策**:
1. Supabaseダッシュボードの「Settings > API」でService Role Keyを確認
2. `.env.local`ファイルに正しいキーを設定

### 重複エラー

**原因**: 既に同期済みのデータが存在する

**解決策**: スクリプトは`upsert`を使用しているため、重複は自動的に処理されます

## 定期実行の設定（オプション）

本番環境では、定期的にStripeとSupabaseの同期を行うことを推奨します：

```bash
# crontabの例（毎日午前2時に実行）
0 2 * * * cd /path/to/your/project && npm run sync:stripe
```

## 注意事項

1. **本番環境での実行前に必ずテスト環境で確認してください**
2. **大量のデータがある場合は、Stripe APIのレート制限に注意してください**
3. **同期中はアプリケーションの決済機能に影響する可能性があります**
4. **バックアップを取ってから実行することを推奨します** 