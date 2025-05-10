#!/bin/bash

# MUED LMS 環境変数同期スクリプト
# 使用法: ./sync-env-vars.sh [環境名]
# 例: ./sync-env-vars.sh production

# 色の定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 引数チェック
if [ -z "$1" ]; then
  echo -e "${RED}エラー: 環境名を指定してください。${NC}"
  echo "使用法: $0 [development|staging|production]"
  exit 1
fi

ENV=$1
echo -e "${YELLOW}環境 '$ENV' の環境変数を同期します...${NC}"

# 環境変数ファイルパスの設定
if [ "$ENV" = "development" ]; then
  VERCEL_ENV_FILE=".env.local"
  HEROKU_ENV_FILE="ai-service/.env.heroku"
  HEROKU_APP="mued-api-dev"
  VERCEL_ENV="development"
elif [ "$ENV" = "staging" ]; then
  VERCEL_ENV_FILE=".env.staging.local"
  HEROKU_ENV_FILE="ai-service/.env.staging.heroku"
  HEROKU_APP="mued-api-staging"
  VERCEL_ENV="preview"
elif [ "$ENV" = "production" ]; then
  VERCEL_ENV_FILE=".env.production.local"
  HEROKU_ENV_FILE="ai-service/.env.production.heroku"
  HEROKU_APP="mued-api"
  VERCEL_ENV="production"
else
  echo -e "${RED}エラー: 無効な環境名です。development, staging, productionのいずれかを指定してください。${NC}"
  exit 1
fi

# Vercel環境変数ファイルの存在チェック
if [ ! -f "$VERCEL_ENV_FILE" ]; then
  echo -e "${YELLOW}警告: Vercel用環境変数ファイル '$VERCEL_ENV_FILE' が見つかりません。${NC}"
  VERCEL_SKIP=true
else
  VERCEL_SKIP=false
fi

# Heroku環境変数ファイルの存在チェック
if [ ! -f "$HEROKU_ENV_FILE" ]; then
  # 開発環境では、標準の.env.herokuが存在するか確認
  if [ "$ENV" = "development" ] && [ -f "ai-service/.env.heroku" ]; then
    HEROKU_ENV_FILE="ai-service/.env.heroku"
    echo -e "${YELLOW}ai-service/.env.herokuを使用します。${NC}"
    HEROKU_SKIP=false
  else
    echo -e "${YELLOW}警告: Heroku用環境変数ファイル '$HEROKU_ENV_FILE' が見つかりません。${NC}"
    HEROKU_SKIP=true
  fi
else
  HEROKU_SKIP=false
fi

# Herokuの環境変数を更新
update_heroku_env() {
  if [ "$HEROKU_SKIP" = true ]; then
    echo -e "${YELLOW}Heroku用の環境変数ファイルが見つからないため、Herokuの更新をスキップします。${NC}"
    return 1
  fi

  echo -e "${YELLOW}Herokuの環境変数を更新します...${NC}"
  
  # Heroku CLIがインストールされているか確認
  if ! command -v heroku &> /dev/null; then
    echo -e "${RED}エラー: Heroku CLIがインストールされていません。${NC}"
    echo "https://devcenter.heroku.com/articles/heroku-cli からインストールしてください。"
    return 1
  fi
  
  # Herokuにログインしているか確認
  if ! heroku auth:whoami &> /dev/null; then
    echo -e "${RED}エラー: Herokuにログインしていません。${NC}"
    echo "heroku login を実行してログインしてください。"
    return 1
  fi
  
  # AIサービス用の環境変数ファイルから読み取り
  echo "AIサービス用の環境変数を '$HEROKU_ENV_FILE' から読み取り中..."
  
  if [ -f "$HEROKU_ENV_FILE" ]; then
    echo "Herokuの環境変数を更新中..."
    # コメント行と空行を除いて、キー=値のペアを抽出
    AI_ENV_VARS=$(grep -v "^#" "$HEROKU_ENV_FILE" | grep -v "^$" | xargs)
    
    if [ -z "$AI_ENV_VARS" ]; then
      echo -e "${YELLOW}警告: Heroku用の環境変数が '$HEROKU_ENV_FILE' に見つかりません。${NC}"
      return 1
    else
      heroku config:set $AI_ENV_VARS --app "$HEROKU_APP"
      if [ $? -eq 0 ]; then
        echo -e "${GREEN}Herokuの環境変数を更新しました。${NC}"
      else
        echo -e "${RED}Herokuの環境変数の更新に失敗しました。${NC}"
        return 1
      fi
    fi
  else
    echo -e "${RED}エラー: ファイル '$HEROKU_ENV_FILE' が見つかりません。${NC}"
    return 1
  fi
  
  return 0
}

# Vercelの環境変数を更新
update_vercel_env() {
  if [ "$VERCEL_SKIP" = true ]; then
    echo -e "${YELLOW}Vercel用の環境変数ファイルが見つからないため、Vercelの更新をスキップします。${NC}"
    return 1
  fi

  echo -e "${YELLOW}Vercelの環境変数を更新します...${NC}"
  
  # Vercel CLIがインストールされているか確認
  if ! command -v vercel &> /dev/null; then
    echo -e "${RED}エラー: Vercel CLIがインストールされていません。${NC}"
    echo "npm install -g vercel を実行してインストールしてください。"
    return 1
  fi
  
  # Vercelにログインしているか確認
  if ! vercel whoami &> /dev/null; then
    echo -e "${RED}エラー: Vercelにログインしていません。${NC}"
    echo "vercel login を実行してログインしてください。"
    return 1
  fi
  
  # Web用の環境変数を更新
  echo "Vercelの環境変数を '$VERCEL_ENV_FILE' から更新中..."
  while IFS= read -r line; do
    # コメント行と空行はスキップ
    if [[ "$line" =~ ^#.*$ || -z "$line" ]]; then
      continue
    fi
    
    # キーと値を分離
    key=$(echo "$line" | cut -d= -f1)
    value=$(echo "$line" | cut -d= -f2-)
    
    # 環境変数を設定
    vercel env rm "$key" "$VERCEL_ENV" --yes 2>/dev/null || true
    echo "$value" | vercel env add "$key" "$VERCEL_ENV"
  done < "$VERCEL_ENV_FILE"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Vercelの環境変数を更新しました。${NC}"
  else
    echo -e "${RED}Vercelの環境変数の更新に失敗しました。${NC}"
    return 1
  fi
  
  return 0
}

# Supabaseの環境変数を更新
update_supabase_env() {
  echo -e "${YELLOW}現在、Supabase Edge Functions環境変数の自動更新はサポートされていません。${NC}"
  echo "Supabaseダッシュボードから手動で更新してください。"
  echo -e "${YELLOW}以下の環境変数が必要です:${NC}"
  echo "STRIPE_SECRET_KEY"
  echo "STRIPE_WEBHOOK_SECRET"
  echo "SUPABASE_URL"
  echo "SUPABASE_SERVICE_ROLE_KEY"
  echo "SUPABASE_SERVICE_KEY"
  
  if [ -f "$VERCEL_ENV_FILE" ]; then
    echo -e "${YELLOW}$VERCEL_ENV_FILE から以下の値が見つかりました:${NC}"
    grep -E "^(STRIPE_SECRET_KEY=|STRIPE_WEBHOOK_SECRET=|SUPABASE_URL=|SUPABASE_SERVICE_ROLE_KEY=|SUPABASE_SERVICE_KEY=)" "$VERCEL_ENV_FILE" 2>/dev/null || echo "見つかりませんでした"
  fi
  
  return 0
}

# メイン処理
echo -e "${YELLOW}環境変数の同期を開始します...${NC}"

update_heroku_env
HEROKU_RESULT=$?

update_vercel_env
VERCEL_RESULT=$?

update_supabase_env
SUPABASE_RESULT=$?

# 結果表示
echo -e "\n${YELLOW}環境変数同期の結果:${NC}"
if [ $HEROKU_RESULT -eq 0 ]; then
  echo -e "Heroku: ${GREEN}成功${NC}"
else
  if [ "$HEROKU_SKIP" = true ]; then
    echo -e "Heroku: ${YELLOW}スキップ${NC}"
  else
    echo -e "Heroku: ${RED}失敗${NC}"
  fi
fi

if [ $VERCEL_RESULT -eq 0 ]; then
  echo -e "Vercel: ${GREEN}成功${NC}"
else
  if [ "$VERCEL_SKIP" = true ]; then
    echo -e "Vercel: ${YELLOW}スキップ${NC}"
  else
    echo -e "Vercel: ${RED}失敗${NC}"
  fi
fi

if [ $SUPABASE_RESULT -eq 0 ]; then
  echo -e "Supabase: ${YELLOW}手動更新が必要${NC}"
else
  echo -e "Supabase: ${RED}失敗${NC}"
fi

echo -e "\n${GREEN}環境変数の同期が完了しました。${NC}" 