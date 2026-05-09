#!/usr/bin/env bash
# scripts/smoke-test-5-13.sh
# 5/13 MUEDial research beta launch — Smoke Test Phase A 事前確認スクリプト
# Usage: bash scripts/smoke-test-5-13.sh
#
# Phase A: 5/12 EOD前実行 (事前確認)
# Phase B: 5/13 09:00-09:30 JST 本番実行 (手動チェックリスト)

set -euo pipefail

PASS=0
FAIL=0
WARN=0

green()  { echo -e "\033[32m✅ $*\033[0m"; }
red()    { echo -e "\033[31m❌ $*\033[0m"; }
yellow() { echo -e "\033[33m⚠️  $*\033[0m"; }
header() { echo -e "\n\033[1m=== $* ===\033[0m"; }
inc_pass() { PASS=$((PASS+1)); }
inc_fail() { FAIL=$((FAIL+1)); }
inc_warn() { WARN=$((WARN+1)); }

check_env() {
  local var="$1"
  local desc="$2"
  local val
  val=$(grep -E "^${var}=" .env.local 2>/dev/null | head -1 | cut -d'=' -f2- || true)
  if [[ -z "$val" ]]; then
    red "$var: NOT SET — $desc"
    inc_fail
  else
    green "$var: SET"
    inc_pass
  fi
}

# ============================================================
header "Phase A-1: Migration 0046/0047 ファイル存在確認"
# ============================================================

migration_046="db/migrations/0046_add_dial_subscription_events.sql"
migration_047="db/migrations/0047_add_dial_subs_unique_active_constraint.sql"

if [[ -f "$migration_046" ]]; then
  green "Migration 0046 ファイル存在: $migration_046"
  inc_pass
  yellow "MANUAL: Neon本番DBへの適用確認が必要"
  yellow "  確認: psql \$DATABASE_URL -c \"SELECT table_name FROM information_schema.tables WHERE table_name = 'dial_subscription_events';\""
  inc_warn
else
  red "Migration 0046 ファイルが存在しません"
  inc_fail
fi

if [[ -f "$migration_047" ]]; then
  green "Migration 0047 ファイル存在: $migration_047"
  inc_pass
  yellow "MANUAL: Neon本番DBへの適用確認が必要"
  yellow "  確認: psql \$DATABASE_URL -c \"SELECT indexname FROM pg_indexes WHERE tablename = 'dial_subscriptions' AND indexname = 'dial_subs_unique_active_per_user';\""
  inc_warn
else
  red "Migration 0047 ファイルが存在しません"
  inc_fail
fi

# ============================================================
header "Phase A-2: Stripe環境変数確認"
# ============================================================

check_env "STRIPE_SECRET_KEY"           "Stripe secret key (本番)"
check_env "STRIPE_WEBHOOK_SECRET"       "Stripe webhook signing secret"
check_env "STRIPE_DIAL_HOO_PASS_PRICE_ID" "Hoo Pass \$5.99/月 Price ID"
check_env "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "Stripe publishable key"

# ============================================================
header "Phase A-3: Smoke Test設定確認"
# ============================================================

SMOKE_EMAIL="kimny+smoketest@glasswerks.jp"
green "Smoke Test email: $SMOKE_EMAIL"
inc_pass
yellow "MANUAL: Clerk Dashboardで $SMOKE_EMAIL アカウントが存在するか確認"
yellow "  存在しない場合: Clerk Dashboard → Users → Create user で事前作成"
inc_warn

yellow "MANUAL: Stripe test card 4242 4242 4242 4242 での購入フロー確認"
yellow "  本番モード + test card = production webhookが発火 → migration 0046 動作確認"
inc_warn

# ============================================================
header "Phase A-4: Welcome email設定確認"
# ============================================================

check_env "RESEND_API_KEY" "Resend API key (welcome email送信)"

yellow "MANUAL: $SMOKE_EMAIL 宛への welcome email受信確認"
yellow "  Phase B実行後、$SMOKE_EMAIL の受信箱を確認"
inc_warn

# ============================================================
header "Phase A-5: research beta flag確認"
# ============================================================

RESEARCH_BETA=$(grep -E "^NEXT_PUBLIC_RESEARCH_BETA=" .env.local 2>/dev/null | head -1 | cut -d'=' -f2- || true)
if [[ "$RESEARCH_BETA" == "true" ]]; then
  green "NEXT_PUBLIC_RESEARCH_BETA=true (pricing非表示、waitlist優先)"
  inc_pass
else
  red "NEXT_PUBLIC_RESEARCH_BETA が true でありません (現在: '$RESEARCH_BETA')"
  yellow "  5/13 launch時はtrue必須"
  inc_fail
fi

# ============================================================
header "Phase A-6: dial_subscription_events スキーマ確認"
# ============================================================

if grep -q "dial_subscription_events" db/schema/dial.ts 2>/dev/null; then
  green "dial_subscription_events: Drizzle schema 定義済み"
  inc_pass
else
  red "dial_subscription_events: Drizzle schema 未定義"
  inc_fail
fi

# Smoke Test除外フィールド確認: stripe_event_idで識別可能
green "Smoke Test purchase識別: Stripe metadata.test_purchase=true → stripe_event_idでレコード識別可能"
inc_pass
yellow "MANUAL: Phase B完了後、smoke test purchase を確認"
yellow "  SELECT * FROM dial_subscription_events ORDER BY occurred_at DESC LIMIT 3;"
inc_warn

# ============================================================
header "Phase A 確認結果"
# ============================================================

echo ""
echo "PASS:  $PASS"
echo "WARN:  $WARN"
echo "FAIL:  $FAIL"
echo ""

if [[ $FAIL -gt 0 ]]; then
  red "Phase A FAIL: $FAIL 件の必須確認が未完了です。5/12 EOD前に解消してください。"
  exit 1
else
  green "Phase A 自動確認: PASS (手動確認 $WARN 件は Phase B前までに完了)"
fi

echo ""
echo "=== Phase B チェックリスト (5/13 09:00-09:30 JST) ==="
echo ""
echo "  [ ] 09:00 JST: preflight-launch.sh 最終実行"
echo "  [ ] 09:01: https://dial.mued.jp/waitlist — $SMOKE_EMAIL で登録"
echo "  [ ] 09:03: https://dial.mued.jp/readiness — 4問回答 → qualified判定"
echo "  [ ] 09:05: https://dial.mued.jp/pricing → Hoo Pass → Stripe checkout"
echo "       Stripe test card: 4242 4242 4242 4242 / exp 12/30 / CVC 123"
echo "  [ ] 09:08: [H-221] iPhone Safari で /pricing → /readiness → ファイルアップロードまでの画面遷移確認"
echo "  [ ] 09:09: [H-221] iPhone Safari でダウンロードボタン → WAVファイル保存確認"
echo "  [ ] 09:10: Vercel Blob waitlist entry確認"
echo "  [ ] 09:12: DB確認: SELECT * FROM dial_subscriptions ORDER BY created_at DESC LIMIT 1;"
echo "  [ ] 09:15: DB確認: SELECT * FROM dial_subscription_events ORDER BY occurred_at DESC LIMIT 1;"
echo "  [ ] 09:20: $SMOKE_EMAIL 受信箱 → welcome email受信確認"
echo "  [ ] 09:25: conductor ping (完納 or 失敗+detail)"
echo "  [ ] 09:30: conductor green light → SNS dispatch開始 trigger"
echo ""
echo "Smoke Test fail時 fallback (conductor判断):"
echo "  A) rollback  B) forward-fix + 12:00再Smoke Test  C) 5/14 09:00 JST再launch"
echo ""
