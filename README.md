# MUED プロジェクト

[![プロジェクトステージ](https://img.shields.io/badge/現在の実装ステージ-Phase%200%20%2F%20MVP-blue)](https://github.com/kimny1143/mued_lms_fgm)

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

### 現在のスタック (Phase 0 / MVP)
- **フロントエンド**: Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS
- **認証**: Supabase Auth + Google OAuth
- **データベース**: PostgreSQL (Prisma ORM)
- **状態管理**: React Query + Zustand
- **リアルタイム機能**: Supabase Realtime
- **AI サービス**: Python/FastAPI (別サービス)
- **支払い処理**: Stripe
- **デプロイ**: Vercel (フロントエンド), Heroku (AIサービス)
- **テスト**: Vitest + React Testing Library + Playwright (E2E)

### 将来計画 (Phase 1)
- **アーキテクチャ**: マイクロサービス (Web/AI/Payment/Scheduling)
- **バックエンド機能強化**: 専用のスケジューリングサービスと支払いサービスの実装

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
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
POSTGRES_PASSWORD=your_postgres_password
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

## プロジェクト構造

```
/
├─ app/                  # Next.js App Routerベースのフロントエンド
│   ├─ api/              # APIルート (Next.js API Routes)
│   ├─ components/       # 再利用可能なUIコンポーネント
│   ├─ landing-sections/ # ランディングページ関連コンポーネント
│   ├─ dashboard/        # ダッシュボード関連ページ
│   ├─ auth/             # 認証関連ページ
│   ├─ reservation/      # 予約関連ページ
│   └─ checkout/         # 決済関連ページ
├─ lib/                  # ユーティリティ関数とAPIクライアント
│   ├─ hooks/            # カスタムReactフック
│   ├─ client/           # APIクライアント実装
│   ├─ supabase-*.ts     # Supabase関連ユーティリティ
│   ├─ stripe.ts         # Stripe統合ユーティリティ
│   └─ googleCalendar.ts # Google Calendar統合
├─ prisma/               # DBスキーマと移行ファイル
│   ├─ schema.prisma     # Prismaスキーマ定義
│   └─ migrations/       # データベース移行ファイル
├─ ai-service/           # Python/FastAPI AIサービス
│   ├─ app/              # FastAPIアプリケーション
│   ├─ tests/            # AIサービステスト
│   └─ openapi/          # OpenAPI仕様
├─ tests/                # フロントエンドテスト (Vitest / Playwright)
├─ public/               # 静的ファイル
└─ scripts/              # ユーティリティスクリプト
```

## テストポリシー

### フェーズ別テスト戦略

#### 1. ユニットテスト（CI Core）
- **実行タイミング**: プルリクエスト時、main/developブランチへのプッシュ時
- **カバレッジ要件**: 80%以上（CIでブロック）
- **実行時間**: 3-4分以内
- **対象**: コアビジネスロジック、ユーティリティ関数

#### 2. E2Eテスト（CI Core）
- **実行タイミング**: プルリクエスト時、main/developブランチへのプッシュ時
- **対象**: クリティカルパス（予約→決済→枠消失）
- **実行時間**: 4-5分以内
- **タグ**: `@core`タグ付きテストのみ実行

### テスト環境

- **テストDB**: Prisma Test DB（並列実行対応）
- **ブラウザ**: Playwright（Chromium, Firefox, WebKit）
- **モック**: MSW（APIモック）、Vitest（ユニットテスト）

### E2E / MCP の動かし方
```bash
# MCP サーバー起動（別ターミナル）
npm run mcp
# Next.js dev サーバー起動
npm run dev
# テスト実行
npm run test:e2e
```

## Metabaseダッシュボード（社内用）

プロジェクトには分析用のMetabaseダッシュボードが含まれています。以下の手順で設定できます：

1. Dockerコンテナを起動: `docker compose up -d`
2. ブラウザで http://localhost:3333 にアクセス
3. 初回セットアップを完了（管理者アカウント作成）
4. データソースとしてMUEDデータベースを接続（Supabase）
5. ダッシュボードの作成・共有

## デプロイ環境

### フロントエンド (Vercel)
- **本番環境**: https://mued-lms.vercel.app
- **プレビュー環境**: PRごとに一意のURLが生成されます（PRコメントで通知）

### AIサービス (Heroku)
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

### トラブルシューティング

問題が発生した場合は、以下のログを確認してください：

1. **ブラウザコンソールログ**: クライアント側のエラーを確認
2. **Vercel Function Logs**: サーバー側のエラーを確認
3. **Stripeダッシュボードログ**: Stripe API呼び出しのエラーを確認

## 開発ガイドライン

- コミットメッセージは[Conventional Commits](https://www.conventionalcommits.org/)に従ってください
- プルリクエストは必ずレビューを受けてからマージしてください
- テストカバレッジは80%以上を維持してください

## ライセンス

© 2024 株式会社グラスワークス All Rights Reserved.
