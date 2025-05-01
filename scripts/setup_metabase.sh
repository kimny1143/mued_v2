#!/bin/bash

# Metabaseセットアップスクリプト
echo "MUED LMS KPIダッシュボードセットアップ"
echo "-----------------------------------"

# ディレクトリを作成
mkdir -p ./metabase-data

# Metabaseコンテナを起動
echo "Metabaseコンテナを起動しています..."
docker-compose up -d metabase metabase-db

# 起動待機
echo "Metabaseの起動を待機しています（1〜2分かかります）..."
sleep 60

echo "Metabaseの起動が完了しました"
echo ""
echo "以下のURLでMetabaseにアクセスしてください:"
echo "http://localhost:3000"
echo ""
echo "初期セットアップ手順:"
echo "1. 管理者アカウントを作成"
echo "2. データソースとしてSupabaseを追加（PostgreSQL接続）"
echo "  - ホスト名: [Supabaseプロジェクトの接続文字列から取得]"
echo "  - ポート: 5432"
echo "  - データベース名: postgres"
echo "  - ユーザー名: [Supabaseダッシュボードで確認]"
echo "  - パスワード: [Supabaseダッシュボードで確認]"
echo "  - SSLモード: require"
echo ""
echo "3. docs/project/kpi-dashboard.mdのクエリをインポート"
echo ""
echo "セットアップ完了後、以下のダッシュボードを作成できます:"
echo "- ユーザー概要ダッシュボード"
echo "- レッスンエンゲージメントダッシュボード"
echo "- 収益指標ダッシュボード" 