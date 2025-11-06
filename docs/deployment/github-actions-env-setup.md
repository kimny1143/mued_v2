# GitHub Actions環境変数設定手順

## 概要

GitHub Actionsでテストを実行するために必要な環境変数をGitHub Secretsに登録する手順です。

## 必要な環境変数一覧

### 🔐 認証関連 (Clerk)

```
CLERK_TEST_PUBLISHABLE_KEY=pk_test_xxxxx (本番とは別のテスト用キー)
CLERK_TEST_SECRET_KEY=sk_test_xxxxx (本番とは別のテスト用キー)
CLERK_WEBHOOK_SECRET=whsec_xxxxx
```

### 💳 決済関連 (Stripe)

```
STRIPE_SECRET_KEY=sk_test_xxxxx (テスト用キー)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
NEXT_PUBLIC_STRIPE_PRICE_STARTER=price_xxxxx
NEXT_PUBLIC_STRIPE_PRICE_BASIC=price_xxxxx
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM=price_xxxxx
```

### 🗄️ データベース関連

```
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/mued_test
```

⚠️ **注意**: GitHub Actionsでは PostgreSQL サービスコンテナを使用するため、`localhost:5432` で接続します。

### 🤖 AI関連 (OpenAI)

```
OPENAI_API_KEY=sk-xxxxx (テスト用または本番キー)
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=2000
```

### 📧 メール関連 (Resend)

```
RESEND_API_KEY=re_xxxxx
```

### 🎨 デザイン関連 (Figma)

```
FIGMA_ACCESS_TOKEN=figd_xxxxx (オプション)
```

### 🌐 アプリケーション設定

```
NEXT_PUBLIC_APP_URL=https://your-staging-url.vercel.app
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

---

## 🚀 設定手順

### 1. GitHubリポジトリのSettings を開く

1. リポジトリページで **Settings** タブをクリック
2. 左サイドバーから **Secrets and variables** → **Actions** を選択

### 2. Secretsを追加

**New repository secret** ボタンをクリックして、以下を1つずつ追加：

#### テスト用 Secrets

| Secret名 | 値の取得方法 |
|----------|------------|
| `CLERK_TEST_PUBLISHABLE_KEY` | [Clerk Dashboard](https://dashboard.clerk.com/) → Test環境 → API Keys |
| `CLERK_TEST_SECRET_KEY` | 同上 |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard → Webhooks → Create Endpoint |
| `TEST_DATABASE_URL` | `postgresql://test:test@localhost:5432/mued_test` (固定値) |
| `OPENAI_API_KEY` | [OpenAI Platform](https://platform.openai.com/) → API Keys |
| `STRIPE_SECRET_KEY` | [Stripe Dashboard](https://dashboard.stripe.com/) → Test mode → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → Add endpoint |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Test mode → Publishable key |
| `NEXT_PUBLIC_STRIPE_PRICE_*` | Stripe Dashboard → Products → Price ID をコピー |
| `RESEND_API_KEY` | [Resend Dashboard](https://resend.com/) → API Keys |
| `FIGMA_ACCESS_TOKEN` | [Figma Settings](https://www.figma.com/settings) → Personal Access Tokens (オプション) |

### 3. 環境変数を追加（Secretsでない公開情報）

**Variables** タブで以下を追加：

```
NEXT_PUBLIC_APP_URL=https://your-staging-url.vercel.app
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=2000
```

### 4. 設定の確認

1. リポジトリの **Actions** タブを開く
2. 最新のワークフロー実行を確認
3. 失敗している場合はログで不足している環境変数を特定

---

## 🔧 トラブルシューティング

### ❌ Tests Failed: Environment variables missing

**原因**: 必要な環境変数がSecretsに登録されていない

**解決策**:
1. エラーログで不足している変数名を確認
2. 上記手順で該当する変数を追加
3. ワークフローを再実行

### ❌ Database connection failed

**原因**: `TEST_DATABASE_URL` が正しく設定されていない

**解決策**:
```bash
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/mued_test
```
を Secrets に追加（GitHub Actions内のPostgreSQLサービスコンテナに接続）

### ❌ Clerk authentication failed

**原因**: 本番環境のキーを使用している、またはテスト環境のキーが無効

**解決策**:
1. Clerk Dashboard で **Test** 環境に切り替え
2. API Keys をコピーして Secrets に登録
3. 本番キーとテストキーを混同しないよう注意

### ❌ Stripe payment tests failed

**原因**: Stripeのテストモードキーまたは Price ID が正しくない

**解決策**:
1. Stripe Dashboard で **Test mode** に切り替え（トグルボタン）
2. API Keys → Publishable key と Secret key をコピー
3. Products → 各プランの Price ID をコピー

---

## 📊 現在の設定状況

### ✅ 既に設定済み（test.yml）

- `NODE_VERSION` (20)
- `PNPM_VERSION` (8)
- `CI` (true)
- `NEXT_PUBLIC_E2E_TEST_MODE` (true)

### ⚠️ 追加が必要

上記の「必要な環境変数一覧」を参照してください。

---

## 🔒 セキュリティのベストプラクティス

1. **本番とテスト環境のキーを分離**
   - 本番キーをGitHub Actionsに登録しない
   - テスト専用のStripe/Clerk/OpenAIキーを使用

2. **最小権限の原則**
   - APIキーには必要最小限の権限のみ付与
   - 定期的にキーをローテーション

3. **Secretsの管理**
   - GitHub Secretsは暗号化されて保存される
   - ログに出力されない（`***` でマスクされる）
   - リポジトリ管理者のみが閲覧・編集可能

4. **環境変数の命名規則**
   - `NEXT_PUBLIC_*`: ブラウザに公開される（公開情報のみ）
   - それ以外: サーバーサイドのみ（機密情報OK）

---

## 📝 次のステップ

1. 上記の環境変数をGitHub Secretsに登録
2. GitHub Actionsワークフローを再実行
3. 全テストがグリーンになることを確認
4. Vercelの環境変数も同様に設定（本番環境用）

---

**作成日**: 2025-10-30
**最終更新**: 2025-10-30
**バージョン**: v1.0.0
