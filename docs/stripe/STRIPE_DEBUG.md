# Stripe連携デバッグガイド

## 問題概要

現在、Vercelデプロイ環境でStripe決済後にサブスクリプション情報が正しく更新されない問題が発生しています。ローカル環境では決済処理自体は成功しますが、サブスクリプションステータスがデータベースに反映されていません。

## 修正内容

以下の修正を実施しました：

1. **Webhook処理のデバッグ機能強化**
   - 詳細なログ出力を追加
   - エラーハンドリングの改善
   - データベース操作の確認ステップ追加

2. **サブスクリプションデータ構造の整合性確保**
   - stripe_user_subscriptions テーブルのカラム名に合わせたデータアクセス
   - データ型の適切な変換処理

3. **チェックアウト成功画面の改善**
   - サブスクリプションステータス表示機能の追加
   - デバッグ情報の表示

## 検証手順

### 1. Stripeウェブフックの設定確認

1. Stripeダッシュボードにアクセス: https://dashboard.stripe.com/
2. 開発者 → Webhooks を選択
3. 以下のエンドポイントが正しく設定されていることを確認:
   - URL: `https://mued-lms-thpkdangn-glasswerks.vercel.app/api/webhooks/stripe`
   - イベント: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

4. 最近のイベント配信履歴を確認し、エラーがあれば対処

### 2. Vercel環境変数の確認

1. Vercelダッシュボードにアクセス: https://vercel.com/
2. MUEDプロジェクト → 設定 → 環境変数 を選択
3. 以下の環境変数が正しく設定されていることを確認:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

### 3. テスト決済の実行

1. デプロイ環境にログイン: https://mued-lms-thpkdangn-glasswerks.vercel.app/
2. ダッシュボード → Plans ページに移動
3. テスト用クレジットカード番号を使って決済を実行:
   - カード番号: `4242 4242 4242 4242`
   - 有効期限: 将来の日付
   - CVC: 任意の3桁
   - 郵便番号: 任意の5桁

4. 決済成功画面でサブスクリプションステータスを確認
5. ダッシュボードに戻り、プラン情報が更新されているか確認

### 4. デバッグログの確認

1. Vercelダッシュボード → MUEDプロジェクト → デプロイメント → 関数ログ を選択
2. Webhook処理関連のログを確認:
   - イベント受信確認
   - データベース操作の成否
   - エラーメッセージの有無

### 5. Supabaseデータの確認

1. Supabaseダッシュボードにアクセス: https://app.supabase.com/
2. MUEDプロジェクト → テーブルエディタ → stripe_user_subscriptions を選択
3. テスト決済後のレコードが正しく作成/更新されているか確認
4. 以下のフィールドを特に確認:
   - `userId`: 正しいユーザーIDと紐づいているか
   - `subscriptionId`: Stripeのサブスクリプションと一致しているか
   - `status`: `active` になっているか

## 既知の問題

1. Stripeイベントとwebhook処理の間にタイミング問題がある可能性
   - webhook受信前にサブスクリプションステータスを確認するとデータがない場合がある
   - 数秒後の再確認で解決する可能性あり

2. テーブル構造とデータ型の不一致
   - Prisma定義と実際のテーブル構造に相違がある可能性
   - カラム名の不一致（例: `priceId` vs `price_id`）

## トラブルシューティング

### Webhookエラー

Stripeダッシュボードで以下を確認:

1. Webhookの署名検証エラー → `STRIPE_WEBHOOK_SECRET` の再生成と更新
2. エンドポイントに到達できない → デプロイURLの正確性を確認
3. 同一エンドポイントで複数の環境を処理していないか

### データベースエラー

Supabaseダッシュボードで:

1. テーブル構造の確認 → スキーマの修正
2. クエリログでエラーを確認 → SQL文法やパラメータの問題対処
3. 適切な権限設定がされているか確認

### ブラウザでの確認

Chromeデベロッパーツールで:

1. ネットワークタブでStripe Checkout Session作成リクエストを確認
2. 決済成功後のAPIレスポンスを確認
3. コンソールログでクライアント側のエラーを特定

## 次のステップ

1. 修正内容のデプロイ → Vercelへの自動デプロイを確認
2. 本番環境でのテスト決済実施 → サブスクリプション更新を確認
3. Webhookログの監視 → 数時間にわたって異常がないことを確認
4. エラー検出時の自動通知設定 → Slack等への連携
