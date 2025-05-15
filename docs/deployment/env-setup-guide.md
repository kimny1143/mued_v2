# MUED LMS 環境変数設定ガイド

このドキュメントは、各環境での環境変数の設定方法についてまとめたガイドです。

## 必要な環境変数一覧

プロジェクトで必要な環境変数を各サービスごとに整理しました。

### Web (Next.js) 用環境変数

```
# Supabase設定 - クライアントサイド公開可能な変数
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000

# データベース接続
DATABASE_URL=postgresql://postgres:your_password@your_supabase_host/postgres

# Stripe設定
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Google OAuth設定
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth.js設定
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Supabase管理設定
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### AIサービス (Python/FastAPI) 用環境変数

```
# AIサービス接続情報 (.env.heroku)
AI_SERVICE_API_KEY=your_ai_service_api_key
CORS_ORIGINS=http://localhost:3000,https://mued-lms.vercel.app
ENVIRONMENT=development
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Edge Functions 用環境変数

```
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

## 開発環境での設定

1. プロジェクトルートに `.env.local` ファイルを作成し、上記のWeb用環境変数を設定します。

2. AIサービスをローカルで実行する場合は、`ai-service` ディレクトリに `.env.local` ファイルをコピーします。

3. Herokuにデプロイする場合の環境変数ファイル `.env.heroku` を作成し、AIサービス用環境変数を設定します。

## 本番環境への設定

### Vercel (Webフロントエンド)

Vercelダッシュボードの設定ページで環境変数を設定します：

1. Vercelプロジェクトを開く
2. 「Settings」→「Environment Variables」を選択
3. 必要な環境変数を追加

### Heroku (AIサービス)

Herokuコマンドラインまたはダッシュボードで環境変数を設定します：

```bash
# Heroku CLIを使用する場合
heroku config:set VARIABLE_NAME=value --app your-app-name

# または、.env.herokuファイルから一括設定
heroku config:set $(cat .env.heroku | xargs) --app your-app-name
```

### Supabase (Edge Functions)

Supabaseダッシュボードのダッシュボードで環境変数を設定します：

1. Supabaseプロジェクトを開く
2. 「Settings」→「API」を選択
3. 「Edge Functions」セクションで「Secrets」を設定

## 環境変数を連携させる方法

アプリケーションが複数の環境（開発、ステージング、本番）でデプロイされる場合は、各環境で一貫した環境変数を保つことが重要です。以下の方法で連携を確保します：

1. `.env.example` ファイルを参照テンプレートとして使用し、各環境に必要な値を記入します。

2. CIパイプラインでは、ビルド時に `GitHub Secrets` または各プラットフォームのAPI経由で環境変数を設定します。

3. 各環境でのデプロイ成功後、以下のコマンドで他の連携サービスの環境変数も更新します：

```bash
# AIサービスのHeroku環境変数を更新
heroku config:set NEXT_PUBLIC_SITE_URL=https://your-vercel-app.vercel.app --app your-heroku-app

# または、更新用のスクリプトを実行
./scripts/sync-env-vars.sh production
```

## トラブルシューティング

環境変数が正しく設定されているか確認するには、以下のコマンドを実行します：

```bash
# Vercelの環境変数を確認
vercel env ls

# Herokuの環境変数を確認
heroku config --app your-app-name

# ローカルでの環境変数確認
node -e "console.log(process.env.VARIABLE_NAME)"
```

環境変数関連の問題が発生した場合は、以下を確認してください：

1. 大文字・小文字が正確に設定されているか
2. 余分なスペースが含まれていないか
3. 適切な引用符（必要な場合）が使用されているか
4. ローカル開発時に `.env.local` ファイルが読み込まれているか

## セキュリティ上の注意点

環境変数の設定には、以下のセキュリティ対策を行います：

1. 秘密キーやAPIキーをGitリポジトリにコミットしない
2. `.gitignore` に機密情報を含むファイルを追加
3. `NEXT_PUBLIC_` で始まる環境変数のみをクライアントサイドで使用
4. 本番環境のシークレットは定期的にローテーション 