# MUED プロジェクト

[![プロジェクトステージ](https://img.shields.io/badge/現在の実装ステージ-Phase%200%20%2F%20Vite%20モノリス-blue)](https://github.com/kimny1143/mued_lms_fgm)

株式会社グラスワークスが運営する音楽レッスン管理ツール（LMS：学習管理システム）のプロジェクトリポジトリへようこそ！

## プロジェクト概要

MUEDは以下の特徴を持つ音楽教育プラットフォームです：

- **AIによるメンターマッチング**と**オリジナル教材の自動生成**
- 講師および受講者のスケジューリング機能
- 学習進捗管理システム
- 教材資料の蓄積と管理
- 講師・生徒間のコミュニケーション機能
- 決済システム連携

## 技術スタック

### Phase 0 (MVP - 現段階)
- **フロントエンド**: Vite + React18 + TypeScript + Tailwind CSS
- **認証**: Supabase Auth + Google OAuth
- **データベース**: PostgreSQL (Prisma ORM)
- **AI サービス**: Python/FastAPI (別サービス)
- **支払い処理**: Stripe
- **デプロイ**: Vercel (フロントエンド), Heroku (APIサービス)
- **テスト**: Vitest + React Testing Library + Playwright (E2E)

### Phase 1 (将来計画)
- **フロントエンド**: Next.js 14 (App Router) + React18
- **アーキテクチャ**: マイクロサービス (Web/AI/Payment/Scheduling)
- **リアルタイム機能**: Supabase Realtime

## 開発環境セットアップ

> **前提条件:**
> 以下の手順を実行するには [NodeJS](https://nodejs.org/en/) がインストールされている必要があります。

### 依存関係のインストール

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# テストの実行
npm test

# ビルド
npm run build
```

### 環境変数の設定

`.env`ファイルを作成し、以下の環境変数を設定してください：

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
POSTGRES_PASSWORD=your_postgres_password
METABASE_DB_PASSWORD=your_metabase_db_password
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

### 開発ガイドライン

- コミットメッセージは[Conventional Commits](https://www.conventionalcommits.org/)に従ってください
- プルリクエストは必ずレビューを受けてからマージしてください
- テストカバレッジは80%以上を維持してください

## プロジェクト構造

```
/
├─ src/                 # Vite＋React のモノリス
│   ├─ components/      # 再利用可能なUIコンポーネント
│   ├─ contexts/        # Reactコンテキスト
│   ├─ lib/             # ユーティリティ関数
│   ├─ screens/         # ページコンポーネント
│   └─ routes/          # ルーティング
├─ ai-service/          # Python/FastAPI AI サービス
├─ prisma/              # DB スキーマと移行ファイル
└─ tests/               # テスト (Vitest / Playwright)
```

## ディレクトリ戦略
- **Phase 0 (MVP)**: Vite モノリス (/src)
- **Phase 1 PoC**: Next.js (apps/web) ※別ブランチで進行
- **AI/Payment Stub**: 現行ディレクトリを維持

## Metabaseダッシュボード（社内用）

プロジェクトには分析用のMetabaseダッシュボードが含まれています。以下の手順で設定できます：

1. Dockerコンテナを起動: `docker compose up -d`
2. ブラウザで http://localhost:3333 にアクセス
3. 初回セットアップを完了（管理者アカウント作成）
4. データソースとしてMUEDデータベースを接続（Supabase）
5. ダッシュボードの作成・共有

### ダッシュボード埋め込み設定

Metabaseダッシュボードは他のアプリケーションに埋め込むことができます：

1. Metabase管理画面から「設定」→「埋め込み」を選択
2. 埋め込みを有効化し、許可されたドメインを設定
3. ダッシュボードを選択し「・・・」メニューから「埋め込み」を選択
4. 生成されたコードをアプリケーションに統合

## デプロイ環境

### フロントエンド (Vercel)
- **本番環境**: https://mued-lms.vercel.app
- **プレビュー環境**: PRごとに一意のURLが生成されます（PRコメントで通知）

### APIサービス (Heroku)
- **本番環境**: https://mued-api.herokuapp.com
- **Swagger UI**: https://mued-api.herokuapp.com/docs

### 環境変数の設定

Vercel/Herokuダッシュボード上で必要な環境変数を設定してください。機密情報は`.env.production`に保存せず、各プラットフォームの環境変数設定を使用してください。

## Vercel環境でのStripe設定に関する注意点

### 発生する可能性のある問題

Vercel環境でStripeを利用する際、以下の問題が発生する可能性があります：

1. **環境変数に改行が含まれる**: 環境変数に改行が含まれると、Stripe APIリクエストの認証ヘッダーが破損し、`Invalid character in header content`エラーが発生する場合があります。
2. **テスト価格IDが存在しない**: Stripeアカウントに存在しない価格IDを使用すると、`No such price: 'price_test_starter'` などのエラーが発生します。

### 対策

#### 環境変数の改行問題の解決方法

1. **環境変数の改行を削除**: 環境変数を設定する際、改行やスペースが含まれていないか確認してください。
2. **環境変数チェック**: 提供されたスクリプトを使用して環境変数の問題を検出・修正できます。

```bash
# 環境変数の問題を検出するスクリプト
node scripts/check-env.js

# 環境変数から改行を削除するスクリプト
bash scripts/vercel-deploy-prep.sh
```

#### Stripe価格IDの問題解決

テスト環境では、以下の方法で対応しています：

1. **動的価格生成**: 存在しない価格IDが指定された場合、自動的にその場で価格を生成します。
2. **フォールバックメカニズム**: 特定のテスト価格IDには、デフォルトの金額とプラン設定を用意しています。

```
- price_test_starter: 月額$20のスターターサブスクリプション
- price_test_premium: 月額$60のプレミアムサブスクリプション
- price_test_basic: 月額$10のベーシックサブスクリプション
- price_test_spot_lesson: $30の単発レッスン
```

### 環境変数の設定方法

#### ローカル環境

`.env.local`ファイルに以下の変数を設定します（改行なし）：

```
STRIPE_SECRET_KEY=sk_test_51RAPn...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51RAPn...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Vercel環境

Vercelダッシュボードの環境変数設定で、改行なしで環境変数を設定してください。

または、Vercel CLIを使用する場合：

```bash
# 環境変数の前処理
bash scripts/vercel-deploy-prep.sh

# クリーンな環境変数でデプロイ
vercel --env-file .vercel/tmp/env.txt
```

### トラブルシューティング

問題が発生した場合は、以下のログを確認してください：

1. **ブラウザコンソールログ**: クライアント側のエラーを確認
2. **Vercel Function Logs**: サーバー側のエラーを確認
3. **Stripeダッシュボードログ**: Stripe API呼び出しのエラーを確認

## ライセンス

© 2024 株式会社グラスワークス All Rights Reserved.
