# MUED LMS v2

**次世代型オンライン学習管理システム（Learning Management System）**

[![Production](https://img.shields.io/badge/production-https%3A%2F%2Fmued.jp-brightgreen)](https://mued.jp)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/license-Proprietary-red)]()

---

## 📋 プロジェクト概要

MUED LMS v2は、AI技術を活用した革新的なオンライン教育プラットフォームです。メンター（講師）と学生を繋ぎ、パーソナライズされた学習体験を提供します。

### 主な機能

- 🤖 **AI教材生成** - OpenAI GPT-5を活用した自動教材作成
- 📅 **レッスン予約システム** - リアルタイムのスロット管理と予約機能
- 💳 **決済統合** - Stripe連携による安全な決済処理
- 👥 **認証・認可** - Clerk認証による安全なユーザー管理
- 💰 **レベニューシェア** - 講師への自動収益分配（70%）
- 📊 **ダッシュボード** - リアルタイムの学習進捗・収益管理
- 💬 **メッセージング** - メンターと学生のコミュニケーション機能

---

## 🚀 技術スタック

### フロントエンド
- **フレームワーク**: Next.js 15.5 (App Router)
- **UI**: React 19, TypeScript 5.x
- **スタイリング**: TailwindCSS 4, Shadcn/UI
- **状態管理**: React Hooks, Context API

### バックエンド
- **認証**: Clerk
- **データベース**: Neon PostgreSQL 17.5
- **ORM**: Drizzle ORM
- **決済**: Stripe
- **AI**: OpenAI API (GPT-4)

### インフラ
- **ホスティング**: Vercel
- **データベース**: Neon (Serverless PostgreSQL)
- **ストレージ**: Vercel Blob Storage
- **CI/CD**: GitHub Actions (予定)

### 開発ツール
- **テスト**: Vitest (Unit), Playwright (E2E)
- **リンター**: ESLint (Flat Config)
- **フォーマッター**: Prettier
- **型チェック**: TypeScript

---

## 📦 セットアップ

### 前提条件

- Node.js 20.x 以上
- npm または pnpm
- PostgreSQLデータベース（Neon推奨）

### インストール

```bash
# リポジトリのクローン
git clone <repository-url>
cd mued_v2

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.local を編集して必要な環境変数を設定
```

### 環境変数

`.env.local` に以下の環境変数を設定：

```bash
# Database
DATABASE_URL="postgresql://..."

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# Stripe
STRIPE_SECRET_KEY="sk_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# OpenAI
OPENAI_API_KEY="sk-..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### データベースのセットアップ

```bash
# マイグレーション実行
npx drizzle-kit push

# インデックス追加（パフォーマンス最適化）
npm run db:add-indexes
```

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

---

## 🛠️ 開発コマンド

### 開発

```bash
npm run dev          # 開発サーバー起動
npm run build        # プロダクションビルド
npm run start        # プロダクションサーバー起動
npm run lint         # リント実行
npm run typecheck    # 型チェック
```

### テスト

```bash
npm run test         # ユニットテスト実行
npm run test:watch   # ユニットテスト（監視モード）
npm run test:e2e     # E2Eテスト実行
npm run test:ui      # テストUI起動
```

### データベース

```bash
npm run db:push      # スキーマ変更を本番DBに反映
npm run db:studio    # Drizzle Studioで可視化
npm run db:add-indexes  # インデックス追加（パフォーマンス最適化）
```

### Stripe

```bash
npm run stripe:setup # Stripe商品・価格設定
npm run stripe:listen # Webhook待受（ローカル開発）
```

---

## 📁 プロジェクト構造

```
mued_v2/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証関連ページ
│   ├── dashboard/         # ダッシュボード
│   ├── api/               # API Routes
│   └── globals.css        # グローバルスタイル
├── components/            # Reactコンポーネント
│   ├── ui/               # 再利用可能なUIコンポーネント
│   ├── features/         # 機能別コンポーネント
│   └── layouts/          # レイアウトコンポーネント
├── db/                    # データベース
│   ├── schema.ts         # Drizzleスキーマ定義
│   └── migrations/       # マイグレーションファイル
├── lib/                   # ユーティリティ・ヘルパー
├── hooks/                 # カスタムフック
├── scripts/               # 開発・運用スクリプト
│   ├── mcp/              # MCP（Model Context Protocol）サーバー
│   └── add-indexes.sql   # DBインデックス追加スクリプト
├── tests/                 # テストファイル
│   ├── unit/             # ユニットテスト
│   └── e2e/              # E2Eテスト
└── docs/                  # ドキュメント
    ├── implementation/    # 実装ドキュメント
    ├── architecture/      # アーキテクチャドキュメント
    └── roadmap/          # ロードマップ
```

---

## 🎯 開発ガイドライン

### コーディング規約

- **TypeScript**: Strict mode有効、`any`型の使用禁止
- **React**: 関数コンポーネント + Hooks使用
- **ファイル構成**: 1ファイル1コンポーネント、200行以下推奨
- **インポート順序**:
  1. React/Next.js
  2. 外部ライブラリ
  3. 内部モジュール (`@/`)
  4. 相対パス
  5. 型定義

### セキュリティ

- 環境変数は `.env.local` で管理（Gitにコミットしない）
- APIキーやシークレットをコードに直接書かない
- Clerk認証のミドルウェアを全保護ルートに適用

### パフォーマンス

- Server Components優先使用
- Client Component (`use client`) は最小限
- 画像は `next/image` で最適化
- データベースクエリは必ずインデックスを活用

### アクセシビリティ

- セマンティックHTML使用
- ARIAラベル適切に設定
- キーボードナビゲーション対応

詳細は [`CLAUDE.md`](./CLAUDE.md) を参照してください。

---

## 🧪 テスト戦略

- **ユニットテスト**: Vitest（カバレッジ目標: 70%）
- **統合テスト**: APIエンドポイント、DB操作
- **E2Eテスト**: Playwright（主要ユーザーフロー）
- **アクセシビリティテスト**: axe-core

---

## 🚀 デプロイ

### Vercelへのデプロイ

本番環境は自動的にVercelにデプロイされます。

```bash
# プレビューデプロイ
git push origin feature/xxx

# 本番デプロイ
git push origin main
```

### 環境変数の設定

Vercel Dashboard で以下を設定：
1. Project Settings → Environment Variables
2. 必要な環境変数を追加（`.env.local` と同じ内容）
3. Redeploy

---

## 📊 パフォーマンス

### 最適化実施済み

- ✅ データベースインデックス追加（12個、2025-10-19）
- ✅ Server Components活用
- ✅ 画像最適化（next/image）
- ✅ コード分割（動的インポート）

### 目標指標

- Lighthouse Score: 90+
- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.5s

---

## 🤝 コントリビューション

プロジェクトへの貢献を歓迎します。

1. Issueを確認または新規作成
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチをプッシュ (`git push origin feature/amazing-feature`)
5. Pull Requestを作成

---

## 📄 ライセンス

Proprietary - 株式会社グラスワークス

---

## 📞 サポート

- **公式サイト**: [https://mued.jp](https://mued.jp)
- **ドキュメント**: `/docs` ディレクトリ参照
- **Issue報告**: GitHub Issues

---

## 📈 プロジェクト進捗

- **現在のフェーズ**: MVP開発
- **実装完了**: 68% (110/162タスク)
- **本番稼働**: 2025年10月10日〜
- **次のマイルストーン**: レベニューシェアシステム実装

詳細は [`docs/COMPREHENSIVE_ANALYSIS_REPORT_2025-10-19.md`](./docs/COMPREHENSIVE_ANALYSIS_REPORT_2025-10-19.md) を参照してください。

---

**Built with ❤️ by MUED Development Team**
