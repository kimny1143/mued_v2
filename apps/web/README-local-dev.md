# MUED LMS ローカル開発環境セットアップガイド

このガイドでは、MUED LMSのローカル開発環境をセットアップする方法を説明します。

## 前提条件

- Node.js 18.x以上
- npm 9.x以上
- Git
- Supabaseプロジェクト（テスト環境）
- Stripeアカウント（テストモード）

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/yourusername/mued_lms_fgm.git
cd mued_lms_fgm
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

```bash
# apps/webディレクトリに移動
cd apps/web

# 環境変数ファイルを作成
cp .env.local.example .env.local
```

`.env.local`ファイルを開き、実際の値を設定してください：

```env
# Supabase設定（Supabaseダッシュボード > Settings > API から取得）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe設定（Stripeダッシュボード > Developers > API keys から取得）
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# ローカル開発URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Supabaseの設定

Supabaseダッシュボードで以下のリダイレクトURLを許可してください：

1. Authentication > URL Configuration > Redirect URLsに移動
2. 以下のURLを追加：
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/m/callback`

### 5. Prismaのセットアップ

```bash
# Prismaクライアントの生成
npx prisma generate
```

### 6. 開発サーバーの起動

```bash
# プロジェクトルートに戻る
cd ../..

# 開発サーバーを起動
npm run dev
```

以下のURLでアクセス可能になります：
- PC版: http://localhost:3000
- モバイル版: http://localhost:3000/m

## モバイル版の開発

### モバイルPWA開発モード

モバイルPWAの機能（Service Workerなど）を開発環境でも有効にする場合：

```bash
# モバイルプレビューモードで起動
cd apps/web
MOBILE_PREVIEW=true npm run dev
```

### 実機でのテスト

ngrokを使用して実機でテストする場合：

```bash
# 別のターミナルでngrokを起動
ngrok http 3000

# 表示されたURLを.env.localに設定
NEXT_PUBLIC_SITE_URL=https://xxxx.ngrok.io
```

## トラブルシューティング

### 認証エラーが発生する場合

1. SupabaseダッシュボードでリダイレクトURLが正しく設定されているか確認
2. 環境変数が正しく設定されているか確認
3. ブラウザのCookieとキャッシュをクリア

### Stripeの決済が動作しない場合

1. Stripeがテストモードになっているか確認
2. テスト用のクレジットカード番号を使用：
   - 成功: `4242 4242 4242 4242`
   - 失敗: `4000 0000 0000 0002`

### ビルドエラーが発生する場合

```bash
# キャッシュをクリアして再ビルド
rm -rf .next
npm run build
```

## 開発のヒント

### デバイス別テスト

- Chrome DevToolsのデバイスモードを使用してモバイル表示を確認
- User Agentを変更してミドルウェアの動作を確認

### デバッグモード

```bash
# デバッグ情報を表示
DEBUG=true npm run dev
```

### パフォーマンス測定

```bash
# 本番ビルドでパフォーマンスを測定
npm run build
npm run start
```

## 注意事項

- **本番環境の認証情報は絶対に使用しないでください**
- `.env.local`ファイルはGitにコミットされません
- Vercelのプレビュー環境には影響しません

## 認証リダイレクト設定

### ローカル開発環境での認証設定

認証時のリダイレクト先を制御するために、必ず`.env.local`で以下を設定してください：

```bash
# ローカル開発環境では必須
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

この設定により、PC版・モバイル版問わず適切なURLにリダイレクトされます。

### Vercelプレビュー環境での設定

Vercelダッシュボードで以下の環境変数を設定：

```bash
# プレビュー環境用（Environment: Preview）
NEXT_PUBLIC_SITE_URL=https://your-preview-url.vercel.app
# または
NEXT_PUBLIC_DEPLOY_URL=https://your-preview-url.vercel.app
```

### トラブルシューティング：認証リダイレクトの問題

#### 症状：本番URLにリダイレクトされる

原因：`NEXT_PUBLIC_SITE_URL`が設定されていない

解決方法：
1. `.env.local`に`NEXT_PUBLIC_SITE_URL=http://localhost:3000`を追加
2. 開発サーバーを再起動（Ctrl+C → `npm run dev`）

#### 症状：認証後にエラーページが表示される

原因：SupabaseダッシュボードでリダイレクトURLが許可されていない

解決方法：
1. Supabaseダッシュボード > Authentication > URL Configuration
2. 以下のURLをすべて追加：
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/m/callback`
   - `https://*.vercel.app/auth/callback`
   - `https://*.vercel.app/m/callback`

## 参考リンク

- [Supabaseドキュメント](https://supabase.com/docs)
- [Stripeテストカード](https://stripe.com/docs/testing)
- [Next.js App Router](https://nextjs.org/docs/app)
- [PWAドキュメント](https://web.dev/progressive-web-apps/)