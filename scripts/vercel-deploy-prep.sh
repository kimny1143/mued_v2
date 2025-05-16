#!/bin/bash

# MUED LMS Vercelデプロイ準備スクリプト
# このスクリプトはVercelのビルド前に実行され、必要な環境設定を行います

# 色の定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}MUED LMS Vercelデプロイ準備スクリプト実行中...${NC}"

# 環境変数の確認
echo -e "${YELLOW}環境変数を確認しています...${NC}"

# helper
safe_append () {
  key=$1
  val=$2
  [ -z "$val" ] && { echo "❌ $key is EMPTY" ; exit 1 ; }
  echo "$key=$val" >> .env.production
}

# Vercel環境の特定
if [ "$VERCEL_ENV" = "production" ]; then
  ENV="production"
  echo -e "${GREEN}本番環境(production)向けのビルドを準備しています${NC}"
  AI_SERVICE_URL="https://mued-api.herokuapp.com"
elif [ "$VERCEL_ENV" = "preview" ]; then
  ENV="staging"
  echo -e "${GREEN}ステージング環境(preview)向けのビルドを準備しています${NC}"
  AI_SERVICE_URL="https://mued-api-staging.herokuapp.com"
else
  ENV="development"
  echo -e "${GREEN}開発環境(development)向けのビルドを準備しています${NC}"
  AI_SERVICE_URL="https://mued-api-dev.herokuapp.com"
fi

# デプロイURLの確認
if [ -n "$VERCEL_URL" ]; then
  DEPLOY_URL="https://$VERCEL_URL"
  echo -e "${GREEN}デプロイURL: $DEPLOY_URL${NC}"
else
  echo -e "${YELLOW}警告: VERCEL_URLが設定されていません${NC}"
  DEPLOY_URL="http://localhost:3000"
fi

# 環境変数の設定
echo -e "${YELLOW}環境変数を設定しています...${NC}"

# NEXT_PUBLIC_AI_SERVICE_URL が設定されていない場合は自動設定
if [ -z "$NEXT_PUBLIC_AI_SERVICE_URL" ]; then
  echo -e "${YELLOW}NEXT_PUBLIC_AI_SERVICE_URL が未設定のため、$AI_SERVICE_URL を設定します${NC}"
  echo "NEXT_PUBLIC_AI_SERVICE_URL=$AI_SERVICE_URL" >> .env.production
fi

# NEXT_PUBLIC_SITE_URL が設定されていない場合は自動設定
if [ -z "$NEXT_PUBLIC_SITE_URL" ]; then
  echo -e "${YELLOW}NEXT_PUBLIC_SITE_URL が未設定のため、$DEPLOY_URL を設定します${NC}"
  echo "NEXT_PUBLIC_SITE_URL=$DEPLOY_URL" >> .env.production
fi

# NEXT_PUBLIC_DEPLOY_URL が設定されていない場合は自動設定
if [ -z "$NEXT_PUBLIC_DEPLOY_URL" ]; then
  echo -e "${YELLOW}NEXT_PUBLIC_DEPLOY_URL が未設定のため、$DEPLOY_URL を設定します${NC}"
  echo "NEXT_PUBLIC_DEPLOY_URL=$DEPLOY_URL" >> .env.production
fi

# AIサービスの接続確認
echo -e "${YELLOW}AIサービスの接続を確認しています...${NC}"
AI_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $AI_SERVICE_URL/health || echo "failed")

if [ "$AI_STATUS" = "200" ]; then
  echo -e "${GREEN}AIサービスに接続できました: $AI_SERVICE_URL${NC}"
else
  echo -e "${YELLOW}警告: AIサービスに接続できません: $AI_SERVICE_URL (ステータス: $AI_STATUS)${NC}"
  echo -e "${YELLOW}ビルドは継続しますが、AIサービスの状態を確認してください${NC}"
fi

# APIルートに動的フラグを追加
echo -e "${YELLOW}APIルートに動的フラグを追加しています...${NC}"
if [ -f "scripts/add-dynamic-flag.js" ]; then
  echo -e "${GREEN}APIルート動的フラグ追加スクリプトを実行します${NC}"
  node scripts/add-dynamic-flag.js
else
  echo -e "${YELLOW}警告: APIルート動的フラグ追加スクリプトが見つかりません。スキップします。${NC}"
fi

# Prismaクライアントの生成
echo -e "${YELLOW}Prismaクライアントを生成しています...${NC}"
npx prisma generate

# 環境変数チェックスクリプトの実行
echo -e "${YELLOW}環境変数のフォーマットをチェックしています...${NC}"
node scripts/check-env.js

echo -e "${GREEN}デプロイ準備が完了しました${NC}"
exit 0 