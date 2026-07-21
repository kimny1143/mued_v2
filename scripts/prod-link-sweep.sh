#!/usr/bin/env bash
#
# prod-link-sweep.sh — resolve every internal link that the live site actually renders.
#
# Authored by product課 (2026-07-21), vendored here so the go-live checklist
# (docs/muedsp/plugin-go-live-checklist.md) can call it. THIS copy is canonical: it is the one under
# version control with review history. product課 keeps a local working mirror and sends improvements as
# PRs here (their call, 2026-07-21) — so if the two ever diverge, this file wins.
#
# Why this exists (2026-07-21): three dead-link bugs shipped in one week because reviews reasoned about
# URL resolution from next.config / middleware instead of measuring it — #712 (welcome-email CTA), #716
# (versions.json manifest url), and #717's blind spot, which left the 特定商取引法 disclosure a hard 404
# from four rendered pages. A string assertion ("url === mued.jp/muedsat") checks the SHAPE of a URL and
# says nothing about whether it RESOLVES. This does the latter, against prod.
#
# Two independent axes, both needed — neither implies the other:
#   rendered  : what a user can click (this script: crawl pages, extract hrefs, resolve them)
#   discovery : what a crawler is told exists (sitemap.xml / llms.txt — see --sitemap-only)
# /tokushoho was correct in the sitemap while being a 404 from every in-page link.
#
# Page list is derived from sitemap.xml, so it stays correct as pages are added — no array to update.
#
# Usage:
#   ./prod-link-sweep.sh                        # sweep https://mued.jp
#   ./prod-link-sweep.sh https://staging.host   # sweep another origin
#   ./prod-link-sweep.sh --sitemap-only         # resolve only the sitemap's own entries
#
# Exit codes:  0 = clean   1 = at least one 404 (hard failure)
# Locale-loss (a bare path that 200s only via redirect) is reported as a WARNING, not a failure:
# it is a UX/SEO defect, not a broken link. Both classes were real findings on 2026-07-21.
#
# SAFETY: /api/ is never requested. `GET /api/plugins/unsubscribe` mutates for real — the signed token IS
# the capability (RFC 8058 one-click), so a valid-token URL unsubscribes that address on GET. A BARE path
# is harmless (the handler returns early on token verification), so do not read this as "curling /api/
# unsubscribes people" — that overstates it, and someone who tests the bare path and sees nothing happen
# could conclude the guard is superstition and remove it. The real exposure is a token-bearing URL reaching
# the sweep from an email body, fixture or log. Public API routes are not a namespace a crawler belongs in.
# Any new side-effecting GET route must be added to SKIP_RE below.
set -uo pipefail

BASE="https://mued.jp"
SITEMAP_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --sitemap-only) SITEMAP_ONLY=1 ;;
    http*) BASE="${arg%/}" ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

SKIP_RE='^/api/'                                   # side-effecting GETs — never request
ASSET_RE='\.(png|jpe?g|svg|webp|ico|css|js|woff2?|pkg|zip|xml|txt)(\?|$)'
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT

echo "== sweeping $BASE =="

# --- page list from the sitemap (self-maintaining) ---
curl -s "$BASE/sitemap.xml" | grep -o '<loc>[^<]*</loc>' | sed 's/<[^>]*>//g' > "$tmp/pages.txt"
echo "sitemap entries: $(wc -l < "$tmp/pages.txt" | tr -d ' ')"

# --- collect targets ---
: > "$tmp/targets.txt"
if [[ $SITEMAP_ONLY == 1 ]]; then
  sed "s#^$BASE##" "$tmp/pages.txt" >> "$tmp/targets.txt"
else
  while read -r page; do
    curl -s "$page" \
      | grep -oE 'href=\\?"[^"\\]+' | sed -E 's/^href=\\?"//' \
      | sed -E "s#^$BASE##" \
      | grep -E '^/' \
      | grep -vE "$SKIP_RE" \
      | grep -vE "$ASSET_RE" >> "$tmp/targets.txt"
  done < "$tmp/pages.txt"
  # the sitemap's own entries are targets too
  sed "s#^$BASE##" "$tmp/pages.txt" >> "$tmp/targets.txt"
fi
sort -u "$tmp/targets.txt" | grep -vE '^/?$' > "$tmp/unique.txt"
echo "unique internal targets: $(wc -l < "$tmp/unique.txt" | tr -d ' ')"
echo

# --- resolve ---
dead=0; warn=0
while read -r path; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE$path")
  case "$code" in
    200) ;;
    3*)  loc=$(curl -s -o /dev/null -w '%{redirect_url}' "$BASE$path")
         final=$(curl -s -o /dev/null -w '%{http_code}' "$loc")
         if [[ "$final" != "200" ]]; then
           printf 'DEAD  %-34s %s -> %s [%s]\n' "$path" "$code" "$loc" "$final"; dead=$((dead+1))
         elif [[ "$loc" =~ /(sign-in|sign-up|login) ]]; then
           # An auth gate. Expected for /dashboard/* — the link is correct, the user just is not signed in.
           printf 'auth  %-34s %s -> %s\n' "$path" "$code" "$loc"
         elif [[ "$loc" =~ /(en|ja)/ ]]; then
           # A bare path that only resolves via a locale redirect: reachable, but a JA reader following it
           # lands on the EN page. This is the second, quieter half of the 2026-07-21 /tokushoho finding —
           # status code alone reads "200 OK" and hides it. Fix at the link, not the redirect.
           printf 'WARN  %-34s %s -> %s (resolves, but the link drops its locale)\n' "$path" "$code" "$loc"
           warn=$((warn+1))
         else
           printf 'info  %-34s %s -> %s\n' "$path" "$code" "$loc"
         fi ;;
    *)   printf 'DEAD  %-34s %s\n' "$path" "$code"; dead=$((dead+1)) ;;
  esac
done < "$tmp/unique.txt"

echo
echo "dead: $dead   locale-loss warnings: $warn"
[[ $dead -eq 0 ]] || { echo "FAIL — a rendered link does not resolve"; exit 1; }
echo "PASS — every rendered internal link resolves"
