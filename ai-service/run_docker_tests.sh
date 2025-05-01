#!/bin/bash

# テストを実行するスクリプト

# カラー表示のためのエスケープコード
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}既存のai-serviceコンテナでテストを実行します...${NC}"

# コンテナが起動しているか確認
if docker-compose ps | grep -q "ai-service.*Up"; then
    # 既存のコンテナでテストを実行
    echo -e "${GREEN}既存のコンテナでテストを実行中...${NC}"
    docker-compose exec ai-service pytest -xvs
else
    # 起動していない場合はテスト専用コンテナを使用
    echo -e "${YELLOW}ai-serviceコンテナが起動していません。テスト専用コンテナを使用します...${NC}"
    docker-compose -f docker-compose.test.yml up ai-service-test --build
fi 