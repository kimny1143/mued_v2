#!/bin/bash

# Vercelデプロイ前に環境変数を整理するスクリプト
echo "Vercelデプロイ前の環境変数前処理を開始します..."

# ディレクトリを作成
mkdir -p .vercel/tmp

# 環境変数チェック
echo "環境変数の問題をチェックしています..."

# Stripe関連の環境変数を検証
check_var() {
  local var_name=$1
  local var_value=${!var_name}
  
  if [[ -z "$var_value" ]]; then
    echo "警告: $var_name が設定されていません"
    return
  fi
  
  # 改行チェック
  if [[ "$var_value" == *$'\n'* ]]; then
    echo "⚠️ $var_name に改行が含まれています - 修正します"
    
    # 改行を削除
    clean_value=$(echo "$var_value" | tr -d '\n\r')
    
    # 環境変数を更新 (一時的)
    eval "$var_name=\"$clean_value\""
    
    # セキュリティのため、値そのものは表示しない
    # 更新後の値の長さだけを表示
    echo "修正済み: ${#clean_value}文字"
    
    # 環境変数ファイルに書き込む場合
    if [[ "$WRITE_ENV_FILE" == "true" ]]; then
      # .envファイルが存在するなら更新する
      if [[ -f ".env" ]]; then
        # この方法はsedの代わりにパターンマッチングを使用
        local new_env_content=""
        while IFS= read -r line; do
          if [[ "$line" == "$var_name="* ]]; then
            echo "環境変数ファイルの $var_name を更新しています"
            new_env_content+="$var_name=\"$clean_value\"\n"
          else
            new_env_content+="$line\n"
          fi
        done < .env
        
        # 新しい内容で.envファイルを更新
        printf "$new_env_content" > .env.tmp
        mv .env.tmp .env
        echo "環境変数ファイルを更新しました"
      fi
    fi
  else
    echo "✅ $var_name は正常です"
  fi
}

# 主要な環境変数をチェック
check_var "STRIPE_SECRET_KEY"
check_var "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
check_var "STRIPE_WEBHOOK_SECRET"
check_var "NEXT_PUBLIC_SUPABASE_URL"
check_var "NEXT_PUBLIC_SUPABASE_ANON_KEY"
check_var "SUPABASE_SERVICE_ROLE_KEY"

# Vercel CLI用の環境変数を設定
echo "Vercel CLIに環境変数を設定しています..."

# STRIPE_SECRET_KEYに改行がある場合、vercel CLI用に修正したバージョンを設定
if [[ -n "$STRIPE_SECRET_KEY" ]]; then
  CLEAN_STRIPE_KEY=$(echo "$STRIPE_SECRET_KEY" | tr -d '\n\r')
  echo "Stripeキーの長さ: ${#CLEAN_STRIPE_KEY}文字"
  
  if [[ "$WRITE_VERCEL_ENV" == "true" ]]; then
    # ローカルテスト用に.vercelディレクトリに環境変数を書き込む
    echo "CLEANキーを.vercel/tmpに設定しています..."
    echo "STRIPE_SECRET_KEY=$CLEAN_STRIPE_KEY" > .vercel/tmp/env.txt
    echo "環境変数が.vercel/tmp/env.txtに書き込まれました"
  fi
fi

echo "環境変数の前処理が完了しました"
echo ""
echo "Vercelデプロイ前の注意点:"
echo "1. 環境変数に改行が含まれている場合は修正する必要があります"
echo "2. Vercel CLIを使う場合は --env-file を使用して改行のない環境変数を渡す"
echo "3. Vercelダッシュボードを使う場合は、手動で改行を削除してください"
echo ""

exit 0 