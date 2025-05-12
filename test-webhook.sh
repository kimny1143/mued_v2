#!/bin/bash
echo "テスト用のStripe webhookエミュレーター (強化版)"
echo "ローカル環境で直接webhookをテストします"

# ユーザーIDを入力
read -p "テストするユーザーID: " USERID

if [ -z "$USERID" ]; then
  echo "ユーザーIDが必要です"
  exit 1
fi

echo "使用するユーザーID: $USERID"

# 製品情報を設定
PRICE_ID="price_1RMJcpRYtspYtD2zQjRRmLXc"  # Starter Subscription
START_DATE=$(date +%s)
END_DATE=$((START_DATE + 2592000))  # 30日後

# 一意のIDを生成
EVENT_ID="evt_$(date +%s)"
SESSION_ID="cs_$(date +%s)"
SUB_ID="sub_$(date +%s)"
CUSTOMER_ID="cus_$(date +%s)"

echo "======== シミュレーション情報 ========"
echo "プロダクトID: $PRICE_ID (Starter Subscription)"
echo "サブスクリプションID: $SUB_ID"
echo "顧客ID: $CUSTOMER_ID"
echo "開始日: $START_DATE ($(date -r $START_DATE))"
echo "終了日: $END_DATE ($(date -r $END_DATE))"
echo "=================================="

# チェックアウトセッション完了イベントのJSON
echo -e "\n1. [checkout.session.completed] イベント送信中..."
CHECKOUT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$EVENT_ID\",
    \"object\": \"event\",
    \"type\": \"checkout.session.completed\",
    \"data\": {
      \"object\": {
        \"id\": \"$SESSION_ID\",
        \"object\": \"checkout.session\",
        \"mode\": \"subscription\",
        \"subscription\": \"$SUB_ID\",
        \"customer\": \"$CUSTOMER_ID\",
        \"metadata\": {
          \"userId\": \"$USERID\"
        }
      }
    }
  }")

echo "レスポンス: $CHECKOUT_RESPONSE"
echo "イベント1送信完了"

sleep 2

# サブスクリプション作成イベントのJSON
echo -e "\n2. [customer.subscription.created] イベント送信中..."
SUB_RESPONSE=$(curl -s -X POST http://localhost:3000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"evt_sub_$EVENT_ID\",
    \"object\": \"event\",
    \"type\": \"customer.subscription.created\",
    \"data\": {
      \"object\": {
        \"id\": \"$SUB_ID\",
        \"object\": \"subscription\",
        \"customer\": \"$CUSTOMER_ID\",
        \"status\": \"active\", 
        \"items\": {
          \"data\": [
            {
              \"price\": {
                \"id\": \"$PRICE_ID\"
              }
            }
          ]
        },
        \"start_date\": $START_DATE,
        \"current_period_end\": $END_DATE
      }
    }
  }")

echo "レスポンス: $SUB_RESPONSE"
echo "イベント2送信完了"

# データベース検証用のコマンド
echo -e "\n3. データベース内容を確認中..."
echo -e "以下のコマンドをブラウザコンソールで実行して確認してください:\n"
echo "await (await fetch('/api/debug/current-user')).json()"
echo "await (await fetch('/api/debug/db-check?userId=$USERID')).json()"
echo "await supabase.from('stripe_user_subscriptions').select('*').eq('userId', '$USERID')"

# 直接挿入を試す(ダミーで直接データを入れる)
echo -e "\n4. 直接データベースにサブスクリプションを挿入します..."
DIRECT_INSERT=$(curl -s -X POST http://localhost:3000/api/debug/db-insert \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USERID\",
    \"subscriptionId\": \"$SUB_ID\",
    \"customerId\": \"$CUSTOMER_ID\",
    \"priceId\": \"$PRICE_ID\",
    \"status\": \"active\",
    \"currentPeriodStart\": $START_DATE,
    \"currentPeriodEnd\": $END_DATE
  }")

echo "直接挿入レスポンス: $DIRECT_INSERT"

echo -e "\nすべての処理が完了しました"
echo "ダッシュボードページをリロードして変更を確認してください"
echo "plan: Free Planがリストのサービスに変更されればOKです" 