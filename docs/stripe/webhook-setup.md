# Stripe Webhook 設定ガイド

Stripe の決済完了後にサブスクリプションを自動更新するための Webhook 設定手順。

---

## 概要

Stripe Checkout で決済が完了すると、Stripe は Webhook イベントを送信します。
このイベントを受け取って、DB の `subscriptions` テーブルを更新します。

**エンドポイント**: `/api/webhooks/stripe`

---

## ローカル開発環境

### 1. Stripe CLI のインストール

```bash
# macOS
brew install stripe/stripe-cli/stripe

# または公式サイトからダウンロード
# https://stripe.com/docs/stripe-cli
```

### 2. Stripe にログイン

```bash
stripe login
```

ブラウザが開くので、Stripe アカウントで認証してください。

### 3. Webhook のフォワード

**別のターミナルで**以下を実行（開発サーバーと並行して動かす）:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

出力例:
```
Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

### 4. 環境変数の設定

`.env.local` に Webhook シークレットを追加:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

> **注意**: `stripe listen` を実行するたびにシークレットが変わる場合があります。

### 5. 動作確認

1. `npm run dev` で開発サーバー起動
2. 別ターミナルで `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. `/dashboard/subscription` からアップグレード
4. テストカードで決済: `4242 4242 4242 4242`
5. リダイレクト後、プランが更新されていることを確認

---

## 本番環境（Vercel / その他）

### 1. Stripe Dashboard で Webhook 登録

1. [Stripe Dashboard](https://dashboard.stripe.com) にログイン
2. **Developers** → **Webhooks** → **Add endpoint**

### 2. エンドポイント設定

| 項目 | 値 |
|-----|-----|
| **Endpoint URL** | `https://your-domain.com/api/webhooks/stripe` |
| **Description** | MUED LMS Subscription Webhooks |
| **Listen to** | Events on your account |

### 3. 購読するイベント

以下のイベントを選択:

#### サブスクリプション関連（必須）
- `checkout.session.completed` - 決済完了
- `customer.subscription.created` - サブスクリプション作成
- `customer.subscription.updated` - サブスクリプション更新
- `customer.subscription.deleted` - サブスクリプション削除

#### 請求関連（推奨）
- `invoice.payment_succeeded` - 請求成功（月次リセット）
- `invoice.payment_failed` - 請求失敗

#### 予約決済関連（LMS機能用）
- `payment_intent.payment_failed` - 支払い失敗
- `payment_intent.canceled` - 支払いキャンセル
- `charge.refunded` - 返金処理
- `checkout.session.expired` - セッション期限切れ

### 4. Webhook シークレットの取得

エンドポイント作成後、**Signing secret** を取得:

1. 作成したエンドポイントをクリック
2. **Signing secret** の「Reveal」をクリック
3. `whsec_` で始まるシークレットをコピー

### 5. 環境変数の設定

Vercel（または本番環境）に環境変数を追加:

```
STRIPE_WEBHOOK_SECRET=whsec_live_xxxxxxxxxxxxx
```

### 6. デプロイ後の確認

1. Stripe Dashboard → Webhooks → エンドポイント選択
2. **Send test webhook** でテスト送信
3. **Webhook attempts** タブで成功を確認

---

## トラブルシューティング

### Webhook が受信されない

```bash
# エンドポイントの動作確認
curl https://your-domain.com/api/webhooks/stripe

# 期待されるレスポンス
{"status":"ok","message":"Stripe webhook endpoint is running","endpoint":"/api/webhooks/stripe"}
```

### 署名検証エラー

```
Webhook Error: No signatures found matching the expected signature for payload
```

**原因**: `STRIPE_WEBHOOK_SECRET` が正しくない

**対処**:
1. Stripe Dashboard で正しいシークレットを確認
2. 環境変数を更新
3. アプリを再起動/再デプロイ

### サブスクリプションが更新されない

1. Webhook イベントが送信されているか確認（Stripe Dashboard → Webhooks → Logs）
2. イベントのステータスが `200` か確認
3. アプリのログでエラーを確認

### 冪等性について

同じイベントが複数回送信されても問題ありません。
`webhookEvents` テーブルで処理済みイベントを追跡しています。

---

## テスト用カード番号

| シナリオ | カード番号 |
|---------|-----------|
| 成功 | `4242 4242 4242 4242` |
| 認証必要 (3DS) | `4000 0025 0000 3155` |
| 拒否 | `4000 0000 0000 9995` |

- **有効期限**: 任意の未来日付（例: `12/26`）
- **CVC**: 任意の3桁（例: `123`）
- **郵便番号**: 任意（例: `12345`）

---

## 関連ファイル

| ファイル | 説明 |
|---------|------|
| `app/api/webhooks/stripe/route.ts` | Webhook ハンドラー |
| `app/api/subscription/checkout/route.ts` | チェックアウト作成 |
| `lib/repositories/subscriptions.repository.ts` | サブスクリプション操作 |
| `db/schema.ts` | `subscriptions`, `webhookEvents` スキーマ |

---

## 環境変数一覧

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_xxxxx          # テスト環境
STRIPE_SECRET_KEY=sk_live_xxxxx          # 本番環境

# Stripe Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Stripe Price IDs
NEXT_PUBLIC_STRIPE_PRICE_BASIC=price_xxxxx
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM=price_xxxxx

# Public Key (フロントエンド用)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

---

*最終更新: 2026-01-20*
