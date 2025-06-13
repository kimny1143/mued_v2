# Vercel自動デプロイ設定ガイド

## 概要

このモノレポでは、2つのアプリケーションが別々のVercelプロジェクトにデプロイされます：
- `apps/web` → `mued-lms-fgm` (PC版)
- `apps/mobile` → `mued-pwa` (モバイル版)

## 自動デプロイの仕組み

### 1. Vercel GitHub統合（推奨）

各Vercelプロジェクトで以下を設定：

#### PC版（mued-lms-fgm）
```
Root Directory: ./
Ignore Build Command: npx turbo-ignore @mued/web
```

#### モバイル版（mued-pwa）
```
Root Directory: ./apps/mobile
Ignore Build Command: npx turbo-ignore @mued/mobile
```

### 2. GitHub Actions（バックアップ）

GitHub Actionsワークフローが用意されています：
- `.github/workflows/deploy-web.yml` - PC版のデプロイ
- `.github/workflows/deploy-mobile.yml` - モバイル版のデプロイ

## セットアップ手順

### Vercel側の設定

1. **PC版プロジェクト（mued-lms-fgm）**
   - Settings → General → Root Directory: `./`（ルート）
   - Settings → General → Ignored Build Command: `npx turbo-ignore @mued/web`

2. **モバイル版プロジェクト（mued-pwa）**
   - Settings → General → Root Directory: `./apps/mobile`
   - Settings → General → Ignored Build Command: `npx turbo-ignore @mued/mobile`

### GitHub側の設定（GitHub Actions使用時）

リポジトリのSettings → Secrets and variables → Actionsで以下を追加：

```
VERCEL_TOKEN=<Vercelトークン>
VERCEL_ORG_ID=team_WMsn5mJNVlgsnLmUmeBZYuhY
VERCEL_PROJECT_ID_WEB=prj_TiaMxHUDPsm4DCmoRKICZxJl1zFT
VERCEL_PROJECT_ID_MOBILE=prj_GdZKwN0HnGSWjeNQFXP1MrSEJyc0
```

## デバッグ

### デプロイチェッカーの実行

```bash
./scripts/check-vercel-deploy.sh
```

このスクリプトは以下を確認します：
- turbo-ignoreが正しく動作しているか
- プロジェクトIDが正しく設定されているか
- 最近の変更がどのアプリに影響するか

### トラブルシューティング

1. **モバイル版がデプロイされない場合**
   - Root Directoryが`./apps/mobile`になっているか確認
   - ignoreCommandが正しく設定されているか確認
   - Vercelビルドログでturbo-ignoreの終了コードを確認

2. **両方のアプリが同時にデプロイされる場合**
   - turbo-ignoreが正しく動作していない可能性
   - package.jsonのnameフィールドを確認（@mued/web、@mued/mobile）

3. **GitHub Actionsが失敗する場合**
   - GitHub Secretsが正しく設定されているか確認
   - Vercelトークンの権限を確認

## 重要な注意点

- `apps/mobile/.vercel/project.json`と`.vercel/project.json`は異なるプロジェクトを指している必要があります
- turbo-ignoreは終了コード0でビルドをスキップ、1でビルドを実行します
- 変更がない場合はデプロイをスキップすることで、ビルド時間とコストを削減できます