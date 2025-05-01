# MUED プロジェクト

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

- **フロントエンド**: Vite + React18 + TypeScript + Tailwind CSS
- **バックエンド**: Supabase (Auth, PostgreSQL)
- **AI サービス**: Python/FastAPI (別コンテナ)
- **テスト**: Vitest + React Testing Library

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
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 開発ガイドライン

- コミットメッセージは[Conventional Commits](https://www.conventionalcommits.org/)に従ってください
- プルリクエストは必ずレビューを受けてからマージしてください
- テストカバレッジは80%以上を維持してください

## プロジェクト構造

```
src/
├── components/     # 再利用可能なUIコンポーネント
├── contexts/       # Reactコンテキスト
├── hooks/         # カスタムフック
├── lib/           # ユーティリティ関数
├── screens/       # ページコンポーネント
└── types/         # TypeScript型定義
```

## Netlifyプレビュー環境

プロジェクトはNetlify上でプレビュー環境を自動的に提供します。これにより以下が可能になります：

- 各ブランチの自動デプロイ
- プルリクエストごとの一時的なプレビュー環境
- 本番環境のステージング検証

### 環境URL

- 本番環境: [https://mued-lms.netlify.app](https://mued-lms.netlify.app)
- プレビュー環境: PRごとに一意のURLが生成されます（PRコメントで通知）
- ブランチプレビュー: `https://branch-name--mued-lms.netlify.app`

### Netlify環境変数の設定

Netlifyダッシュボード上で以下の環境変数を設定してください：

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=your_api_url
```

## ライセンス

© 2024 株式会社グラスワークス All Rights Reserved.
