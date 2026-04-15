#!/bin/bash
# Register a RoEx vendor credit pack purchase in the DB.
#
# Usage:
#   ./scripts/register_roex_pack.sh <amount_usd> <credits> [note]
#
# Examples:
#   ./scripts/register_roex_pack.sh 80 10000
#   ./scripts/register_roex_pack.sh 80 10000 "Large pack 2026-04-15"
#   ./scripts/register_roex_pack.sh 20 2500 "Small pack refill"

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <amount_usd> <credits> [note]"
  echo "Example: $0 80 10000 \"Large pack 2026-04-15\""
  exit 1
fi

npx tsx scripts/roex/register-vendor-pack.ts "$@"
