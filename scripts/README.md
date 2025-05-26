# Scripts Directory 整理計画

## 現在の状況
scriptsフォルダに40以上のスクリプトが存在し、何を使うべきか分からない状態。

## 整理方針

### 🟢 保持するスクリプト（DBリセット後の初期設定に必要）

#### 1. 環境リセット・初期化
- `reset-development-environment.js` - **メイン**: 完全環境リセット
- `check-environment-safety.js` - 環境安全性チェック
- `seed-test-db.ts` - テストデータ投入

#### 2. 開発時デバッグ・確認
- `check-current-user-customer.js` - ユーザー状況確認
- `debug-frontend-subscription.js` - フロントエンド状況確認
- `check-supabase-permissions.ts` - 権限確認

#### 3. Stripe連携修正
- `sync-stripe-to-supabase.js` - Stripe-Supabase同期
- `fix-customer-mismatch.js` - 顧客データ不整合修正

#### 4. 環境設定
- `gen-env.ts` - 環境変数生成
- `check-env.js` - 環境変数確認

### 🔴 削除対象スクリプト（古い・重複・特定問題用）

#### Webhook関連（古い問題解決済み）
- `check-webhook-logs.js`
- `trigger-stripe-webhook.js`
- `test-webhook-direct.js`
- `update-stripe-webhook-preview.js`
- `update-stripe-webhook.js`
- `test-new-webhook.js`
- `webhook-reset.js`
- `fix-webhook-supabase.js`
- `debug-webhook-error.js`
- `test-webhook-retry.js`
- `test-webhook-endpoint.js`
- `test-webhook.js`
- `test-stripe-webhook.ts`

#### 特定問題修正用（一時的）
- `fix-subscription-sync.js` - 新しいリセットスクリプトに統合済み
- `investigate-stripe-subscriptions.js` - デバッグ用、必要時のみ
- `debug-customer-subscription.js` - 重複機能
- `update-subscription-manually.js` - 手動修正用、不要
- `fix-subscription-data.js` - 重複機能
- `cleanup-stripe-data.js` - リセットスクリプトに統合済み

#### SQL修正ファイル（一時的）
- `fix-stripe-table-permissions.sql`
- `fix-stripe-sync-permissions.sql`
- `fix-test-customer-issue.sql`
- `fix-billing-portal-issue.sql`

#### その他不要
- `setup-protection-bypass.js`
- `create-free-plan.js`
- `check-supabase-tables.js`
- `check-stripe-prices.js`
- `add-dynamic-flag.js`
- `add-dynamic-flag.ts`
- `setup_metabase.sh`

### 🟡 アーカイブ対象（将来必要になる可能性）
- `seed-e2e.ts` - E2Eテスト用
- `sync-env-vars.sh` - 環境変数同期
- `check-supabase-data.js` - データ確認用

## 整理後のディレクトリ構造

```
scripts/
├── README.md                           # このファイル
├── reset-development-environment.js    # メインリセットスクリプト
├── check-environment-safety.js         # 環境安全性チェック
├── seed-test-db.ts                     # テストデータ投入
├── check-current-user-customer.js      # ユーザー状況確認
├── debug-frontend-subscription.js      # フロントエンド確認
├── check-supabase-permissions.ts       # 権限確認
├── sync-stripe-to-supabase.js         # Stripe同期
├── fix-customer-mismatch.js            # 顧客データ修正
├── gen-env.ts                          # 環境変数生成
├── check-env.js                        # 環境変数確認
└── archived/                           # アーカイブ
    ├── seed-e2e.ts
    ├── sync-env-vars.sh
    └── check-supabase-data.js
```

## 推奨使用フロー

### 1. 開発環境完全リセット
```bash
npm run reset:dev
```

### 2. 問題発生時のデバッグ
```bash
npm run check:user           # ユーザー状況確認
npm run debug:frontend       # フロントエンド確認
npm run check:env-safety     # 環境確認
```

### 3. 軽微な修正
```bash
npm run sync:stripe          # Stripe同期
npm run fix:customer         # 顧客データ修正
```

## package.json スクリプト整理後

```json
{
  "scripts": {
    "reset:dev": "node scripts/reset-development-environment.js",
    "check:env-safety": "node scripts/check-environment-safety.js",
    "check:user": "node scripts/check-current-user-customer.js",
    "debug:frontend": "node scripts/debug-frontend-subscription.js",
    "sync:stripe": "node scripts/sync-stripe-to-supabase.js",
    "fix:customer": "node scripts/fix-customer-mismatch.js",
    "seed": "npx tsx scripts/seed-test-db.ts",
    "gen-env": "npx tsx scripts/gen-env.ts",
    "check-env": "node scripts/check-env.js",
    "check:supabase-permissions": "npx tsx scripts/check-supabase-permissions.ts"
  }
}
``` 