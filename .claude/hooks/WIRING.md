# Hook wiring — the registrations that make the scripts in this directory run

★**The scripts here are tracked. The registration that runs them is not.**
`.claude/settings.local.json` is excluded by a **global** gitignore (`~/.config/git/ignore:3`,
`**/.claude/settings.local.json`), so it lives on one disk, in no clone and no backup. Losing this
working copy leaves every script in this directory present and **silent** — which is the exact
failure CLAUDE.md already warns about ("ガードは『置いてある』ではなく『配線されている』ことを確認する",
where one course's `block-main-push.sh` sat unwired from the day it was scaffolded and never once
fired). This file is the recoverable half.

★**Measured 2026-08-29** — this is what the wiring is, not what it ought to be.

| Event | Script | What it does |
|---|---|---|
| `SessionStart` | `claude-code-template/.claude/hooks/load-handoff-memory.sh` | injects status.md's three fields + a handoff memory |
| `SessionStart` | `.claude/hooks/status-caps-notice.sh` | prints whether status.md's injected fields exceed the 6,000 B cap |
| `SessionStart` | `.claude/hooks/skill-durability-notice.sh` | prints whether any skill under `.claude/skills` is unclassified |
| `PreToolUse` | `.claude/hooks/block-main-push.sh` | blocks `git push` issued while `main`/`master` is checked out |
| `PreToolUse` | `claude-code-template/.claude/hooks/validate-dangerous-ops-v2.sh` | ×3 matchers — destructive-operation guard |

★**Scripts present here but NOT wired** (deliberate — they are older or superseded; listed so their
silence is a recorded fact rather than something to rediscover):
`suggest-claude-md-update.sh`, `suggest-git-cleanup.sh`, `suggest-poc-log-update.sh`,
`validate-dangerous-ops.sh` (superseded by `-v2`).

## To restore after losing settings.local.json

Recreate the `hooks` key with the rows above. Paths are absolute in the live file; the
template-owned ones point into `claude-code-template`, the repo-owned ones into this repo.

★**Then verify it is actually wired, not merely written**: start a session and look for the two
section headers (`── status.md cap 検査 ──`, `── skill 復旧経路 検査 ──`) in the startup output.
★A hook that exists and is registered can still be doing nothing; the printed output is the evidence.

## Keeping this file honest

★It is a copy, so it can drift from the live file, and a drifted copy is worse than none — it would
be restored as if correct. When changing the wiring, change it here in the same commit. The rows
above were read out of the live `settings.local.json`, not written from memory.
