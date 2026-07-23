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
# BLIND SPOT — a page can be live and invisible to BOTH axes. /learn is exactly that today: 200 in prod,
# zero sitemap entries, and zero inbound hrefs anywhere on the live site (measured) — staged behind
# LEARN_LIVE by design. Nothing here will ever look at it. Do not read a PASS as "the site is fine";
# read it as "every link that exists resolves". A URL about to go live is in this third state, which is
# why the go-live checklist curls /en/{key} individually instead of trusting a sweep.
#
# Page list is derived from sitemap.xml, so it stays correct as pages are added — no array to update.
#
# Usage:
#   ./prod-link-sweep.sh                        # sweep https://mued.jp
#   ./prod-link-sweep.sh https://staging.host   # sweep another origin
#   ./prod-link-sweep.sh --sitemap-only         # resolve only the sitemap's own entries
#
# Exit codes:  0 = clean   1 = at least one 404 (hard failure)   3 = inconclusive (nothing verifiable)
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
anchors=0
if [[ $SITEMAP_ONLY == 1 ]]; then
  sed "s#^$BASE##" "$tmp/pages.txt" >> "$tmp/targets.txt"
else
  while read -r page; do
    html="$(curl -s "$page")"
    # Extract href from ANY tag, not just <a>. Be honest about what this buys TODAY: nothing. An <a>-only
    # filter loses five hrefs at this step on mued.jp (/connect, /{en,ja}/muedsat, /{en,ja}/muedlim, which
    # appear only in <link rel=alternate>), but every one of them is also in the sitemap, so the union
    # below restores all five — measured 38 targets either way. Broad extraction is PRECAUTIONARY: the
    # sitemap is not guaranteed to be a superset of the live pages, so a <link> pointing at an unlisted
    # page would be missed by <a>-only + union. There is no such instance right now. Kept because
    # resolving a URL is a plain GET — the net costs nothing to widen, and the claim above is small
    # enough to survive being checked. (Two earlier versions of this comment overstated the benefit and
    # were corrected by review; an inflated rationale gets the design thrown out with it.)
    printf '%s' "$html" \
      | grep -oE 'href=\\?"[^"\\]+' | sed -E 's/^href=\\?"//' \
      | sed -E "s#^$BASE##" \
      | grep -E '^/' \
      | grep -vE "$SKIP_RE" \
      | grep -vE "$ASSET_RE" >> "$tmp/targets.txt"
    # Count <a> tags separately. This does NOT decide what gets checked — only whether checking means
    # anything at all (see the coverage gate below).
    n=$(printf '%s' "$html" | grep -oE '<a [^>]*href="[^"]*"' | wc -l | tr -d ' ')
    anchors=$((anchors + n))
  done < "$tmp/pages.txt"
  # the sitemap's own entries are targets too
  sed "s#^$BASE##" "$tmp/pages.txt" >> "$tmp/targets.txt"
fi
sort -u "$tmp/targets.txt" | grep -vE '^/?$' > "$tmp/unique.txt"
echo "unique internal targets: $(wc -l < "$tmp/unique.txt" | tr -d ' ')"

# --- coverage gate: is this origin actually server-rendering clickable links? ---
# This sweep only sees what is in the SERVER-RENDERED HTML. On a client-rendered site (Vite/CRA SPA) the
# shell carries assets plus canonical/alternate <link>s and nothing else — every navigation link is built
# by JS after load. Those stray <link> hrefs are enough to make a run look busy and print a confident PASS
# having verified essentially nothing. A check that cannot fail is worse than no check: it manufactures
# false comfort. So the verdict is gated on <a> tags, which exist only if the server rendered real links.
# Found the hard way (product課, 2026-07-21): sweeping www.glasswerks.jp (Vite SPA) returned PASS while
# seeing zero clickable links. Measured: mued.jp = 199 anchors across 35 pages; glasswerks = 0.
INCONCLUSIVE=0
if [[ $SITEMAP_ONLY == 0 ]]; then
  echo "clickable <a> links seen in server-rendered HTML: $anchors"
  if [[ "$anchors" -eq 0 ]]; then
    INCONCLUSIVE=1
    echo
    echo "!! INCONCLUSIVE — not one <a> tag came back in the server-rendered HTML."
    echo "!! This origin is almost certainly client-rendered, so its real links are invisible to curl"
    echo "!! and any PASS here would be meaningless. Verify it with a headless browser (rendered DOM)."
  fi
fi
echo

# --- resolve ---
dead=0; warn=0
while read -r path; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE$path")
  case "$code" in
    200) ;;
    3*)  loc=$(curl -s -o /dev/null -w '%{redirect_url}' "$BASE$path")
         # Follow the WHOLE chain (-L) for the pass/fail status, not one hop. A single-hop check misreports
         # a legitimate multi-hop redirect (307→307→200) as DEAD by mistaking the intermediate 3xx for the
         # final status — a real false-FAIL. `loc` stays the FIRST hop (that is what reveals a dropped
         # locale); only the verdict uses the fully-resolved end of the chain. (Hardened 2026-07-23: no
         # multi-hop redirect exists on mued.jp today, so nothing changes here now, but the latent bug was
         # real — surfaced when conductor asked whether the sweep could fail in the -L direction.)
         final=$(curl -sL -o /dev/null -w '%{http_code}' "$BASE$path")
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
# Never print PASS when coverage was nil — that is exactly the false comfort the gate above exists to stop.
[[ $INCONCLUSIVE -eq 0 ]] || { echo "INCONCLUSIVE — nothing meaningful was verified (see above)"; exit 3; }
echo "PASS — every rendered internal link resolves"
