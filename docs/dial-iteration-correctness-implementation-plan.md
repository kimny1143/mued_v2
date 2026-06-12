# ⑤ Dialogue iteration correctness — implementation plan (APPROVED design, 2026-06-12)

Branch: `feat/dial-iteration-correctness`. Tier3 (touches the render/charge journey). kimny GO
(2026-06-12, 4-point set via conductor). This is the durable resume doc — implement from §3.

## 0. What was disproven (do NOT revert to it)
The original "mint fresh `/mixpreview` → **immediately** `/retrievefinalmix`" (synchronous, inside
`/api/dial/final`) was **disproven** by the 9-stem latency experiment
(`scripts/experiment-dial-latency.ts`, run `b2hk3ku8n`): an immediate final on a fresh large task
returns **500 in 11s AND consumes credits** ("Service completed but did not return results. Your
credits have been used"). RoEx `/retrievefinalmix` needs the base preview RENDERED first (8-22min),
which exceeds Vercel `maxDuration=300s`. See memory
`reference-roex-retrievefinalmix-needs-ready-preview`. → The fix is **client-orchestrated async**.

## 1. Approved design (kimny 4 points)
1. ⑤ = switch to REAL audio per iteration (no more cached stale render).
2. Wait UX = **U1** (progress-bar button, reuse the existing generation-wait UI) **+ U3** (honest
   expectation copy: each adjustment re-renders, takes minutes) **+ U2** (Hoo "batch your tweaks"
   guidance), with **detect-and-regen** default (unchanged params since last render → return the
   existing take instantly, no re-render, no charge).
3. **mix_check ALSO renders real every time** (NOT just final) — this is the director's-seat core.
4. free15 gets the real full experience; ordering = ⑤ fix into main → open 15 seats.

### ⚠️ Scope guards (hard)
- **DO NOT touch `returnStems` anywhere.** stems-off is explicitly EXCLUDED (CFO correction:
  mix_check stems are used by in-player stem-solo, `session-takes.ts`; removing re-breaks PR-A
  cross-take bleed). `/final` keeps `returnStems: !isFreeCampaign` exactly. The fresh `/preview`
  reuses `/preview`'s existing `returnStems: true` (0cr — preview is free — so no cost change).
- **U3 expectation copy ships in THIS PR** (EN/JA i18n). conductor voice-checks the copy drafts
  (kimny final not needed). U2 Hoo prompt = same PR or fast-follow (mued sequencing call).
- baseCycleLimit 5→3 already merged (PR #462). Cost model update = conductor → CFO after direction.

## 2. Why client-orchestrated solves latency (the must-verify, by construction)
Each adjustment: client calls `/preview` (mints a fresh base task, returns immediately) → the
EXISTING client poll (`page.tsx` poll loop) drives it to ready via `/api/dial/preview` GET, which is
already #434-hardened for the 8-22min preview render (backstop 60min) → once ready, client calls
`/final` on that ready task (fast, p50 ~6s, same as today). **No single RPC blocks >300s.** The
fresh preview render reuses the path built specifically for long preview renders; `/final` only ever
runs on a ready task (the exact condition the experiment showed is required). Orphan-charge risk is
unchanged from today because `/final` is unchanged.

## 3. Implementation (client-only; NO server route change, NO schema/migration)
All in `app/dial/session/[id]/page.tsx` (+ i18n copy + a small take filter + unit-testable helper).

### 3a. Helper: which preview to render on (avoid wasted renders)
The initial preview's FIRST `/retrievefinalmix` is fresh (not cached) — so the first render can reuse
it. Only AFTER a preview has been rendered do we need a fresh one. Add a pure helper (unit-tested):
```
getUnusedCompletedPreview(tasks): Task | null
  // latest completed preview with NO mix_check/final created at-or-after it (createdAt compare)
  // → that preview is "unused" and safe to /retrievefinalmix once (fresh). Else null = mint fresh.
```

### 3b. detect-and-regen (client-side, fail-safe toward the bounded default)
- `paramsHash = stableStringify(latestParamChanges)` (the Hoo effects that will be applied).
- Keep `lastRenderedParamsHashRef`. On a render request: if `paramsHash === lastRenderedParamsHashRef`
  AND a completed mix_check/final take exists → **no-op** (toast: "前回から変更がないため、最新のミックスを表示しています" /
  "No changes since the last mix — showing your latest take."). Do NOT mint/charge.
- Reset the ref on track edits / style change (those change the base mix).
- After a render completes, set the ref to that render's hash. (Client-side is fail-SAFE: a miss only
  falls back to the existing bounded re-render — it can never CAUSE an extra charge beyond baseline,
  which is capped by baseCycleLimit=3.)

### 3c. The orchestration state machine
New state: `pendingRender: { previewTaskId: string; type: 'mix_check' | 'final' } | null`.

`requestRender(type)` (called by handleMixCheckFromChat / handleFinalFromChat):
1. detect-and-regen short-circuit (3b) → return if unchanged.
2. `const usable = getUnusedCompletedPreview(session.tasks)`.
3. If `usable` → `handleMixGenerate(usable.id, type)` directly (today's fast path; first render).
4. Else → mint fresh: `POST /api/dial/preview {sessionId}` → on success `fetchSession()` then set
   `pendingRender = { previewTaskId: <new preview task id>, type }` and `mixGenerating = true`.
   (The POST response returns `taskId` = the new dial_task id; use it.)

New effect: when `pendingRender` is set and `session.tasks` shows that `pendingRender.previewTaskId`
is `completed` → `handleMixGenerate(pendingRender.previewTaskId, pendingRender.type)` then clear
`pendingRender`. (If it goes `failed` → surface error, clear pendingRender, mixGenerating=false.)

Progress/U1: make `mixGenerating` (or a derived `isRendering`) TRUE while `pendingRender !== null`
too (today it only tracks final/mix_check processing — during the fresh-preview phase there's no
final task yet). Wire `pendingRender` into the mixGenerating-sync effect and the elapsed-time effect.

### 3d. Hide intermediate previews (clean take list)
In the `sessionTakes` memo (or a thin wrapper around `buildSessionTakes`), drop `preview` takes that
are superseded — i.e. a completed preview that has a mix_check/final task created at-or-after it. The
initial preview stays visible until the first mix_check; intermediate fresh previews never clutter.
Keep `buildSessionTakes` itself stable (PR-A); filter in the page memo or add an opt-in param.

### 3e. U3 copy (THIS PR, i18n EN/JA)
- Generation-wait subtext (when rendering a dialogue iteration): EN "Re-rendering your mix with the
  new adjustments — this takes a few minutes each time (we rebuild the whole mix)." / JA「新しい調整で
  ミックスを作り直しています。毎回数分かかります（ミックス全体を作り直すため）。」
- A one-line note near the Mix Check / Final buttons setting the expectation up front.
- U2 nudge (Hoo): "まとめて調整を伝えてから生成すると、待ち時間を減らせます" — same PR if cheap, else fast-follow.
Submit copy drafts to conductor for voice-check before finalizing.

## 4. Evidence / tests (character gate)
- **9-stem correct-sequence render** (`scripts/experiment-dial-latency.ts` extended, or a new probe):
  mint fresh `/mixpreview` → poll to ready → `/retrievefinalmix` effA, then a SECOND fresh task with
  effB → confirm md5(A) ≠ md5(B) (real adjustment reflected) and both download as valid WAV. Attach
  md5s. (pool ~250-500cr, within ~17,890cr.) This is the "speed→honesty" before/after proof.
- Unit: `getUnusedCompletedPreview` (used/unused cases), detect-and-regen hash equality/skip, the
  intermediate-preview take filter.
- typecheck / lint / build / unit green.

## 5. PR
Tier3 → product (2g7xrfai) → conductor merge. Character gate = the 9-stem md5 before/after + a
described manual smoke (2 mix_checks with different Hoo params → 2nd is audibly different, not cached).

## 6. Follow-ups (NOT this PR)
- **Yuu existing-session recovery**: baseCycleLimit 5→3 only affects NEW sessions (set at checkout).
  Investigate whether Yuu's existing session needs an ops fix; escalate to conductor. (Read-only DB =
  kimny-gated.)
- Cost-model canonical update (conductor → CFO).
- stems-off = separate decision (recommend KEEP).
- Optional: server-side detect-and-regen hardening (store hash on session) if client-side proves leaky.
