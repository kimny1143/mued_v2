#!/bin/bash
# Vercel環境変数の改行チェックスクリプト

set -e

echo "🔍 Vercel環境変数チェック..."
echo ""

# Production環境変数をダウンロード
echo "📥 Production環境変数をダウンロード中..."
vercel env pull .env.vercel.production --environment production > /dev/null 2>&1

# 改行チェック
echo ""
echo "✅ NEXT_PUBLIC_STRIPE_PRICE_* の値をチェック:"
echo ""

for var in STARTER BASIC PREMIUM; do
  key="NEXT_PUBLIC_STRIPE_PRICE_${var}"
  value=$(grep "^${key}=" .env.vercel.production | cut -d'"' -f2)

  # 改行チェック
  if echo "$value" | od -An -tx1 | grep -q "0a"; then
    echo "❌ ${key}: 改行が含まれています！"
    echo "   値: ${value}"
    echo "   Hex: $(echo "$value" | od -An -tx1 | tr -d ' ')"
  else
    echo "✅ ${key}: OK"
    echo "   値: ${value}"
  fi
  echo ""
done

# クリーンアップ
rm -f .env.vercel.production

echo "🎉 チェック完了！"
