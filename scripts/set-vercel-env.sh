#!/bin/bash
# Vercel環境変数を改行なしで設定するスクリプト

set -e

echo "🔧 Vercel環境変数を設定中..."
echo ""

# 一時ファイルを作成（改行なし）
printf "price_1SJVJoDIriBJJnLqGDZ1DtaB" > /tmp/vercel_starter.txt
printf "price_1SJVJoDIriBJJnLqrLNzLeJK" > /tmp/vercel_basic.txt
printf "price_1SJVJpDIriBJJnLqwNSLG9II" > /tmp/vercel_premium.txt

# Vercel CLIで設定（リダイレクトを使用）
echo "Setting NEXT_PUBLIC_STRIPE_PRICE_STARTER..."
vercel env add NEXT_PUBLIC_STRIPE_PRICE_STARTER production < /tmp/vercel_starter.txt

echo "Setting NEXT_PUBLIC_STRIPE_PRICE_BASIC..."
vercel env add NEXT_PUBLIC_STRIPE_PRICE_BASIC production < /tmp/vercel_basic.txt

echo "Setting NEXT_PUBLIC_STRIPE_PRICE_PREMIUM..."
vercel env add NEXT_PUBLIC_STRIPE_PRICE_PREMIUM production < /tmp/vercel_premium.txt

# クリーンアップ
rm -f /tmp/vercel_*.txt

echo ""
echo "✅ 完了！"
echo ""
echo "確認: ./scripts/verify-vercel-env.sh"
