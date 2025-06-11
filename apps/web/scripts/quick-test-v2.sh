#!/bin/bash

# v2 API簡易テストスクリプト

echo "🚀 v2 API Quick Test"
echo "===================="

# ベースURL設定
if [ -z "$API_BASE_URL" ]; then
  API_BASE_URL="http://localhost:3000"
fi

# 認証トークン（必要に応じて設定）
AUTH_TOKEN="$TEST_AUTH_TOKEN"

echo "Testing: $API_BASE_URL/api/lesson-slots-v2"
echo ""

# 1. 基本的な動作確認
echo "1️⃣ Basic health check..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE_URL/api/lesson-slots-v2" \
  ${AUTH_TOKEN:+-H "Authorization: Bearer $AUTH_TOKEN"})

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "401" ]; then
  echo "❌ Authentication required. Please set TEST_AUTH_TOKEN environment variable"
  echo "   Example: TEST_AUTH_TOKEN='your-token' ./scripts/quick-test-v2.sh"
  exit 1
elif [ "$HTTP_CODE" = "200" ]; then
  echo "✅ API is responding (HTTP $HTTP_CODE)"
  
  # データ件数を確認
  COUNT=$(echo "$BODY" | jq '. | length' 2>/dev/null || echo "parse error")
  echo "📊 Returned items: $COUNT"
  
  # サンプルデータを表示
  if [ "$COUNT" != "parse error" ] && [ "$COUNT" -gt 0 ]; then
    echo ""
    echo "📝 Sample data (first item):"
    echo "$BODY" | jq '.[0] | {id, teacherId, startTime, endTime, isAvailable}' 2>/dev/null || echo "Unable to parse JSON"
  fi
else
  echo "❌ API error (HTTP $HTTP_CODE)"
  echo "$BODY"
  exit 1
fi

echo ""
echo "2️⃣ Comparing with v1 API..."

# v1 APIとの比較
V1_RESPONSE=$(curl -s "$API_BASE_URL/api/lesson-slots" \
  ${AUTH_TOKEN:+-H "Authorization: Bearer $AUTH_TOKEN"})

V1_COUNT=$(echo "$V1_RESPONSE" | jq '. | length' 2>/dev/null || echo "0")

echo "📊 v1 API items: $V1_COUNT"
echo "📊 v2 API items: $COUNT"

if [ "$V1_COUNT" = "$COUNT" ]; then
  echo "✅ Both APIs return the same number of items"
else
  echo "⚠️  Item count differs between v1 and v2"
fi

echo ""
echo "✅ Test completed!"
echo ""
echo "Next steps:"
echo "1. Check server logs for '✅ V2 API:' messages"
echo "2. Verify the data matches your expectations"
echo "3. Test with different parameters (e.g., ?viewMode=all)"