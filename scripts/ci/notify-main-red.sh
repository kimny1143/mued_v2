#!/usr/bin/env bash
#
# Turn a red scheduled CI run into a GitHub issue, and close that issue when main recovers.
#
# Why this exists (measured 2026-07-29, conductor):
#   - 13 CI failures in 2026-07 (11 PR, 1 on main, 1 other)
#   - Actions-failure emails received in the last 60 days, incl. spam/trash: 0
#   - `ci_activity` entries in the GitHub notification inbox: 0 of 50
#   - PR/issue comment notifications: verified arriving
# So Actions failures reach nobody, while issue notifications do. This converts the channel that
# does not work into the one that does. Note this hole predates the switch to a scheduled run —
# it was already 0/13 while `push: main` existed, so the daily run did not create it.
#
# Logic lives here rather than inline in the workflow so it can be exercised for real without a
# CI round-trip — the local test runs THIS file, not a copy of it.
#
# Required env:
#   NEEDS_JSON  toJSON(needs) from the workflow — {"validate":{"result":"success"},...}
#   RUN_URL     link back to the run
# Optional env:
#   LABEL (default ci-main-red), TITLE, GH_REPO (gh picks up the cwd repo otherwise)
set -euo pipefail

LABEL="${LABEL:-ci-main-red}"
TITLE="${TITLE:-CI: main is red (scheduled run)}"
: "${NEEDS_JSON:?NEEDS_JSON is required}"
: "${RUN_URL:?RUN_URL is required}"

# ★Anything that is not exactly "success" is red — failure, cancelled, skipped, neutral, null.
# An EMPTY result set is red too: "we got no answer" is not "everything passed" (a job list that
# silently becomes empty would otherwise report green forever).
failed=$(printf '%s' "$NEEDS_JSON" | jq -r '[.[].result] | if length == 0 then true else any(. != "success") end')
summary=$(printf '%s' "$NEEDS_JSON" | jq -r 'to_entries | map("\(.key)=\(.value.result // "null")") | join(" · ")')
[ -n "$summary" ] || summary="(no job results reported)"

# Idempotent: creates the label the first time, updates it afterwards.
# NOT silenced with `|| true`. Note the reason is NOT "so the step goes red" — a red step in this
# repo notifies nobody, which is the whole premise of this script. It is that swallowing the error
# here would let the run continue and finish *successfully* while no issue was ever filed: a
# genuinely silent loss. Failing leaves a record on the run for anyone who does look, and stops
# us reporting a notification that did not happen.
gh label create "$LABEL" --color B60205 --description "Scheduled CI run on main is failing" --force >/dev/null

existing=$(gh issue list --label "$LABEL" --state open --json number --jq '.[0].number // empty')

if [ "$failed" = "true" ]; then
  body="Scheduled CI run on \`main\` failed.

- Jobs: ${summary}
- Run: ${RUN_URL}

Main is not covered by a per-merge CI run any more (see the comment in \`.github/workflows/test.yml\`),
so this issue is the notification. It closes itself when a later scheduled run is fully green."
  if [ -n "$existing" ]; then
    echo "red: commenting on existing issue #${existing}"
    gh issue comment "$existing" --body "$body"
  else
    echo "red: opening a new issue"
    gh issue create --title "$TITLE" --label "$LABEL" --body "$body"
  fi
else
  if [ -n "$existing" ]; then
    echo "green: closing issue #${existing}"
    gh issue comment "$existing" --body "Recovered — scheduled run green (${summary}). ${RUN_URL}"
    gh issue close "$existing"
  else
    echo "green: nothing open, nothing to do"
  fi
fi
