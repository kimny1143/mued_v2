#!/usr/bin/env bash
# scripts/preflight-launch.sh
# 5/12 EOD preflight check for 5/13 MUEDial research beta launch
# Usage: bash scripts/preflight-launch.sh

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
  elif [[ "$val" == *"your_"* ]] || [[ "$val" == *"placeholder"* ]] || [[ "$val" == *"_monthly" && "$var" == *"PRICE_ID"* ]]; then
    yellow "$var: placeholder value detected — update before launch"
    inc_warn
  else
    green "$var: set"
    inc_pass
  fi
}

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  MUEDial 5/13 Research Beta Launch Preflight  ║"
echo "╚══════════════════════════════════════════════╝"

# ─── 1. Environment variables ─────────────────────
header "1. Environment Variables (.env.local)"

check_env "NEXT_PUBLIC_RESEARCH_BETA"         "Research beta price-hiding flag (must be 'true')"
check_env "BLOB_READ_WRITE_TOKEN"             "Vercel Blob token for waitlist storage"
check_env "RESEND_API_KEY"                    "Email delivery for waitlist welcome email"
check_env "UPSTASH_REDIS_REST_URL"            "Rate limiting (Upstash Redis)"
check_env "UPSTASH_REDIS_REST_TOKEN"          "Rate limiting (Upstash Redis)"
check_env "DATABASE_URL"                      "Neon PostgreSQL connection string"

# Check NEXT_PUBLIC_RESEARCH_BETA is exactly 'true'
beta_val=$(grep -E "^NEXT_PUBLIC_RESEARCH_BETA=" .env.local 2>/dev/null | head -1 | cut -d'=' -f2- || true)
if [[ "$beta_val" == "true" ]]; then
  green "NEXT_PUBLIC_RESEARCH_BETA=true confirmed (price-hiding active)"
else
  red "NEXT_PUBLIC_RESEARCH_BETA is '$beta_val' — must be 'true' for research beta"
  inc_fail
fi

# ─── 2. TypeScript / Lint / Build ─────────────────
header "2. Code Quality Checks"

echo "Running typecheck..."
if npm run typecheck --silent 2>&1 | tail -3; then
  green "typecheck: passed"
  inc_pass
else
  red "typecheck: FAILED — fix before launch"
  inc_fail
fi

echo "Running lint..."
if npm run lint --silent 2>&1 | tail -3; then
  green "lint: passed"
  inc_pass
else
  red "lint: FAILED — fix before launch"
  inc_fail
fi

echo "Running unit tests..."
if npx vitest run --config vitest.config.unit.ts --silent 2>&1 | tail -3; then
  green "unit tests: passed"
  inc_pass
else
  red "unit tests: FAILED — fix before launch"
  inc_fail
fi

# ─── 3. DB Migration check ────────────────────────
header "3. DB Migration (Neon)"

# The hoo_pass enum value is still required even though the tier is retired: existing rows may
# reference it and Postgres cannot drop an in-use enum value. Checking the migration is still correct.
migration_file="db/migrations/0045_add_hoo_pass_tier.sql"
if [[ -f "$migration_file" ]]; then
  green "Migration file 0045 exists: $migration_file"
  inc_pass
  yellow "MANUAL: Verify migration was applied to Neon production DB"
  yellow "  Run: psql \$DATABASE_URL -c \"SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'dial_sub_tier';\""
  inc_warn
else
  red "Migration file 0045 missing — expected: $migration_file"
  inc_fail
fi

migration_file_046="db/migrations/0046_add_dial_subscription_events.sql"
if [[ -f "$migration_file_046" ]]; then
  green "Migration file 0046 exists: $migration_file_046"
  inc_pass
  yellow "MANUAL: Verify migration 0046 was applied to Neon production DB"
  yellow "  Run: psql \$DATABASE_URL -c \"SELECT table_name FROM information_schema.tables WHERE table_name = 'dial_subscription_events';\""
  inc_warn
else
  red "Migration file 0046 missing — expected: $migration_file_046"
  inc_fail
fi

migration_file_047="db/migrations/0047_add_dial_subs_unique_active_constraint.sql"
if [[ -f "$migration_file_047" ]]; then
  green "Migration file 0047 exists: $migration_file_047"
  inc_pass
  yellow "MANUAL: Verify migration 0047 was applied to Neon production DB"
  yellow "  Run: psql \$DATABASE_URL -c \"SELECT indexname FROM pg_indexes WHERE tablename = 'dial_subscriptions' AND indexname = 'dial_subs_unique_active_per_user';\""
  inc_warn
else
  red "Migration file 0047 missing — expected: $migration_file_047"
  inc_fail
fi

# ─── 4. Stripe Configuration ──────────────────────
header "4. Stripe Configuration"

# No subscription price id to check: Hoo Pass was retired 2026-07 (#650) together with its checkout
# route, and nothing else here is sold as a subscription. This section previously required
# STRIPE_DIAL_HOO_PASS_PRICE_ID and failed without it — i.e. it pushed whoever ran a launch check
# toward configuring a product that is no longer for sale.
green "No subscription price ids required (MUEDial is one-off purchases only since 2026-07)"
inc_pass

# ─── 5. Manual checklist ──────────────────────────
header "5. Manual Verification Required"
echo ""
echo "  □ Stripe Dashboard: 退役 tier (hoo_pass/basic/pro/studio) の Price ID がすべて inactive"
echo "  □ Vercel Dashboard: NEXT_PUBLIC_RESEARCH_BETA=true set (Production)"
echo "  □ Vercel Dashboard: BLOB_READ_WRITE_TOKEN set (Production)"
echo "  □ Browser: dial.mued.jp/waitlist — form submits successfully"
echo "  □ Browser: dial.mued.jp/pricing — prices show 'Coming soon' (research beta)"
echo "  □ Browser: dial.mued.jp — opens without console errors"
echo ""

# ─── Summary ──────────────────────────────────────
header "Summary"
total=$((PASS + FAIL + WARN))
echo "  Passed:   $PASS / $total"
echo "  Warnings: $WARN"
echo "  Failed:   $FAIL"
echo ""

if [[ $FAIL -eq 0 && $WARN -eq 0 ]]; then
  green "All checks passed — LAUNCH READY ✅"
  exit 0
elif [[ $FAIL -eq 0 ]]; then
  yellow "Warnings present — review before launch"
  exit 0
else
  red "FAIL: $FAIL critical checks failed — DO NOT LAUNCH until fixed"
  exit 1
fi
