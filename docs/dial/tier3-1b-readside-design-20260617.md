# Tier3 Phase 1b — read-side switch design note (2026-06-17)

Companion to the write-side (PR #496). The read-side switch makes `dial_sessions.state`
**authoritative** for behavior — replacing the per-request task-inference in
`lib/dial/phase.ts` (`detectPhase` / `isMasteringPhase`). This is the **behavioral** half of
Phase 1b (Tier3-likely) and is a follow-up PR after #496.

This note captures the non-obvious findings from grounding the switch in current code, so the
implementation doesn't fall into the regression traps below.

## Reader inventory (sites that consume the inferred phase today)

| Site | Current read | Target |
|---|---|---|
| `app/api/dial/chat/route.ts:121` | `detectPhase(session, allTasks)` → `phase` / `isMasteringPhase` | `session.state` |
| `app/api/dial/chat/route.ts:253` | `getDialTools({ mode, isMasteringPhase, locale })` | `selectToolsByState({ state, mode, masteringMode, locale })` |
| `lib/ai/prompts/dial.ts:1289` | `buildDialSystemPrompt` branches on `input.isMasteringPhase` | derive from `state` |
| `lib/ai/prompts/dial.ts:1372` | `getDialTools` (the `:1389` bug, below) | `selectToolsByState` |
| `app/dial/session/[id]/page.tsx:1150` | `isMasteringPhase` (client-recomputed from tasks) | `session.state` / `isMasteringState` |
| `components/dial/v2/chat.tsx:273,363,414,420,435,460,490,495,598` | `isMasteringPhase` prop | `state`-derived prop |
| `components/dial/v2/unified-session-player-v2.tsx:425` | `chatProps.isMasteringPhase` | `state`-derived |

## TRAP 1 — `isMasteringPhase` ≠ `isMasteringState` (would regress the handoff)

`detectPhase`'s `isMasteringPhase` (lib/dial/phase.ts:67-69):
- **mix+master** (`mode` set, `masteringMode` set): `hasMixFinal && !hasMasteringFinal`
- **mastering-only** (`mode` null, `masteringMode` set): `!hasMasteringFinal`

Mapped onto the 8-state machine, `isMasteringPhase === true` corresponds to:
- mix+master: **`state ∈ { mix_final, mastering_review }`**
- mastering-only: **`state ∈ { uploading, mastering_review }`** (before `mastered_final`)

`isMasteringState(state)` (lib/dial/session-state.ts) = `mastering_review || mastered_final`.

So a naive `isMasteringPhase → isMasteringState` substitution is **wrong on both ends**:
1. It **excludes `mix_final`** → at `mix_final` the user would lose the mastering prompt/tool, breaking
   the mix→mastering handoff (legacy gives it there, because the mastering preview is generated from
   `mix_final`).
2. It **includes `mastered_final`** → after the master is committed, legacy turns the mastering phase
   OFF (`hasMasteringFinal` true); `isMasteringState` would wrongly keep mastering tools live.

**Correct read-side helper** (mode-aware, faithful to legacy intent):

```
isMasteringToolPhase(state, mode, masteringMode):
  if !masteringMode: return false                       // mix-only session — never
  if mode == null:   return state != 'mastered_final'   // mastering-only: until committed
                            && state != 'settling' && state != 'delivered'
  // mix+master:
  return state == 'mix_final' || state == 'mastering_review'
```

This replaces `isMasteringPhase` for the prompt + tool selection. `isMasteringState` (the existing
predicate) is the right read for "is the master committed / are we past the mix" UI flags, NOT for the
tool-phase gate.

## TRAP 2 — `getDialTools` `:1389` leaks the mastering tool into the mix phase

`getDialTools` dialogue branch (lib/ai/prompts/dial.ts:1386-1390) returns
`[set_style, mix_action, **mastering_action**]`. The mastering tool is exposed during the pure mix
phase (`isMasteringPhase === false`). It is **not** needed for the handoff — the handoff happens when
`isMasteringPhase` flips true on the next request after mix-final, routing to the mastering branch.
The server-side guards (chat/route.ts:298-322) catch a premature `request_mastering_final`, so this is
latent rather than actively harmful — but `selectToolsByState` should drop the mastering tool from the
mix states, which is the intended fix.

`selectToolsByState({ state, mode, masteringMode, locale })`:
- `isMasteringToolPhase(...)` → `[set_style, mastering_action]`
- else `mode === 'omakase'` → `[set_style, omakase_action]`
- else (mix dialogue) → `[set_style, mix_action]`  ← no mastering tool (TRAP 2 fixed)

## TRAP 3 — R-1 (kill auto-Final) is one of TWO auto-inject blocks

`chat/route.ts` has two text-driven auto-inject blocks:
- **328-338**: auto-inject `adjust_preview` when Hoo narrates making a preview but forgot the tool
  (fixes Haiku ~15% drop-rate; the Yuu dead-end). **KEEP.**
- **344-365**: auto-inject `request_final` / `request_mix_check` / `request_mastering_final` when Hoo
  writes "button will appear" text. **R-1 targets the `request_final` auto-promote here** (and the
  client mirror at `components/dial/v2/chat.tsx:363-365`, `adjust_preview & phase===3 → request_final`).

R-1 = require explicit user approval before a (paid) Final; do **not** also remove the
`adjust_preview` auto-inject or the `request_mix_check` path without a separate decision. Scope R-1 to
the Final auto-promotion only.

## Sequencing & dependencies

- **Base = write-side (#496).** Readers must not trust `state` until it's written accurately
  everywhere — so the read-side branch builds on (or merges after) #496.
- `phase` (1/2/3) is also consumed for prompt copy + cycle notes; the switch can keep `phase` from
  `detectPhase` initially and only move the `isMasteringPhase`/tool gate to `state`, OR derive `phase`
  from `state` too. Recommend a **minimal first cut**: move only the mastering-tool gate + R-1 to
  `state`, leave `phase` derivation as-is, to keep the behavioral diff small and reviewable.

## Open questions (conductor / kimny)

1. **Mastering tool-phase semantics** — confirm `isMasteringToolPhase` above matches intended behavior
   (mastering tools live at `mix_final` for mix+master; off at `mastered_final`).
2. **Minimal vs full read-side** — move only the tool-gate + R-1 to `state` first (recommended), or
   replace `phase` derivation wholesale in this PR?
3. **R-1 UX** — after killing auto-promote, what's the explicit-approval affordance (the existing
   Final button on the ParamChangeCard already requires a click; confirm that's the approval gate and
   we're only removing the *text-triggered* auto-injection).
