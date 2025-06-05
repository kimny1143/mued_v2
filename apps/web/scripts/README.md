# Scripts Directory

MUED LMSプロジェクトの管理・メンテナンス用スクリプト集

## 📁 ディレクトリ構造

```
scripts/
├── README.md                           # このファイル
├── reset-development-environment.js    # 開発環境の完全リセット
├── check-environment-safety.js         # 環境安全性チェック
├── check-env.js                        # 環境変数確認
├── gen-env.ts                          # 環境変数生成
├── check-supabase-permissions.ts       # Supabase権限確認
├── analyze-current-db-state.js         # データベース状態分析
├── check-current-db-state.js           # 現在のDB状態確認
├── sync-stripe-to-supabase.js          # Stripe-Supabase同期
├── fix-customer-mismatch.js            # 顧客データ不整合修正
├── check-current-user-customer.js      # ユーザー状況確認
├── debug-frontend-subscription.js      # フロントエンド状況確認
├── check-reservation-status.js         # 予約状況確認
├── check-cron-targets.js               # Cronジョブターゲット確認
├── seed-lesson-sessions-simple.js      # レッスンセッション作成
└── archived/                           # アーカイブ済みスクリプト
    ├── check-supabase-data.js
    ├── seed-e2e.ts
    └── sync-env-vars.sh
```

## 🚀 使い方

### 環境管理

#### 開発環境の完全リセット
```bash
node scripts/reset-development-environment.js
```
- Supabaseデータベースの完全リセット
- Stripe顧客データのクリーンアップ
- 初期データの投入

#### 環境安全性チェック
```bash
node scripts/check-environment-safety.js
```
本番環境での実行を防ぐ安全性チェック

#### 環境変数の確認・生成
```bash
node scripts/check-env.js              # 環境変数の確認
npx tsx scripts/gen-env.ts              # .env.localファイルの生成
```

### データベース管理

#### DB状態の確認
```bash
node scripts/analyze-current-db-state.js  # 詳細な分析
node scripts/check-current-db-state.js    # 現在の状態確認
```

#### Supabase権限の確認
```bash
npx tsx scripts/check-supabase-permissions.ts
```

### Stripe連携

#### Stripe-Supabase同期
```bash
node scripts/sync-stripe-to-supabase.js
```
Stripeの顧客・サブスクリプションデータをSupabaseに同期

#### 顧客データ不整合の修正
```bash
node scripts/fix-customer-mismatch.js
```

### デバッグ・確認

#### ユーザー状況確認
```bash
node scripts/check-current-user-customer.js <email>
```
特定ユーザーの状況を詳細に確認

#### フロントエンド状況確認
```bash
node scripts/debug-frontend-subscription.js
```
フロントエンドで発生する問題のデバッグ

#### 予約状況確認
```bash
node scripts/check-reservation-status.js
```
予約と決済の状況を確認

#### Cronジョブ確認
```bash
node scripts/check-cron-targets.js
```
Cronジョブの実行対象を確認

### レッスンセッション管理

#### 既存予約のセッション作成
```bash
node scripts/seed-lesson-sessions-simple.js --dry-run  # ドライラン
node scripts/seed-lesson-sessions-simple.js            # 本実行
```
既存の承認済み・確定済み予約にlesson_sessionsレコードを作成

## 📝 package.jsonスクリプト

以下のコマンドをpackage.jsonに追加することを推奨：

```json
{
  "scripts": {
    "dev:reset": "node scripts/reset-development-environment.js",
    "dev:check-env": "node scripts/check-env.js",
    "dev:check-user": "node scripts/check-current-user-customer.js",
    "dev:check-db": "node scripts/check-current-db-state.js",
    "dev:sync-stripe": "node scripts/sync-stripe-to-supabase.js",
    "dev:debug-frontend": "node scripts/debug-frontend-subscription.js"
  }
}
```

## ⚠️ 注意事項

1. **環境の確認**: スクリプト実行前に必ず環境を確認（production環境での実行は危険）
2. **バックアップ**: 重要なデータ変更を行う前にバックアップを取る
3. **ドライラン**: 可能な場合は`--dry-run`オプションで事前確認
4. **権限**: 一部のスクリプトは管理者権限が必要

## 🗂️ アーカイブ済みスクリプト

`archived/`フォルダには、現在は使用していないが将来必要になる可能性があるスクリプトを保存：

- `check-supabase-data.js` - Supabaseデータの確認
- `seed-e2e.ts` - E2Eテスト用のシードデータ
- `sync-env-vars.sh` - 環境変数の同期（シェルスクリプト）

## 🔧 メンテナンス

- 新しいスクリプトを追加する際は、明確な目的と使用方法をコメントに記載
- 一時的なスクリプトは作業完了後に削除
- 定期的にスクリプトの必要性を見直し、不要なものは削除またはアーカイブ