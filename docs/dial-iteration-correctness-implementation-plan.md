# ⑤ Dialogue iteration correctness — implementation plan (resume doc, 2026-06-12)

Branch: `feat/dial-iteration-correctness`. Tier3 (core billing/render path). Plan-first APPROVED by
conductor (4 points + simplification). This doc is the durable handoff for the compacted next
session — execute step 2 from here.

> ## ⚠️ 2026-06-12 UPDATE — the "immediate final" simplification below is DISPROVEN
> The 9-stem latency experiment (`scripts/experiment-dial-latency.ts`, run `b2hk3ku8n`) proved that
> calling `/retrievefinalmix` immediately on a FRESH (un-rendered) large task **charges-and-fails**
> (500 in 11s: "Service completed but did not return results. Your credits have been used"). The base
> preview render (8-22min for real sessions) MUST complete before `/retrievefinalmix`. So the
> synchronous `submit()` design in Step 2 below is NOT viable — it would charge-and-fail every real
> iteration. The correct fix is **client-orchestrated**: each iteration re-runs the existing async
> `/preview` (mint + client-poll to ready) THEN `/final` applies effects to the now-ready fresh task.
> Cost shift (freee): today's 2nd+ iterations are FREE RoEx cache-hits → become real 250cr+ charges.
> Escalated to conductor (URGENCY:mid, 2026-06-12) as a kimny-domain UX+cost decision. See
> memory `reference-roex-retrievefinalmix-needs-ready-preview`. Steps 2-3 below are kept ONLY as the
> record of what was disproven; do NOT implement them as written.

## Status
- ✅ **baseCycleLimit 5→3** (commit `c3c8c80d`): `checkout/route.ts` sets per mode — omakase=1,
  dialogue=3, else schema default. Both insert paths (admin bypass + transaction).
- ✅ **Experiment** (commit on branch, `scripts/experiment-dial-iteration.ts`): ⑤ CONFIRMED.
- ⬜ **⑤ core fix** — NOT YET implemented. Steps below.
- ⬜ before/after audio evidence + unit tests.
- ⬜ Tier3 PR → product(2g7xrfai) review → conductor merge.
- stems-off = SEPARATE kimny decision (recommend KEEP — degrades in-player stem soloing; NOT in this PR).

## Confirmed problem (experiment run bttlx8vam, md5 = primary evidence)
RoEx is **task-level idempotent**. mix_check/final reuse `previewTask.roexTaskId`
(`final/route.ts:164`, `mixing.ts:176`) → 2nd+ render on a used task returns the CACHED first
render for free, ignoring new effects.
- A (M1, neutral EQ) md5 `6b7de1c2…` == B (M1 SAME task, +6dB@5k) md5 `6b7de1c2…` → byte-identical
  = cached old audio (B returned in 1s = free cache hit; no dashboard charge for B).
- C (M2 NEW task, +6dB@5k) md5 `8eaf6032…` ≠ B → a fresh task renders the new audio.
- Immediate final on a just-submitted preview returns valid audio in ~16s (small input) → no
  separate preview-poll needed; `/retrievefinalmix` pipelines auto-mix+effects.

## The fix (core) — mint a fresh multitrackTaskId per dialogue render
**Only the dialogue `isAdvanced` path** in `final/route.ts` (omakase = single final, ⑤ N/A, and it
depends on the preview's FX retrieval — leave as-is).

Replace `taskId: previewTask.roexTaskId` with a freshly-minted `/mixpreview` task per render.

### Step-by-step (`app/api/dial/final/route.ts`)
1. **Imports** — add to the `@/lib/roex` import: `mixPreview, mapMusicalStyle, mapInstrumentGroup, type MixTrackInput`.
2. **isAdvanced submit builder** (currently ~`:150-169`): before `mixFinalAdvanced`, build a fresh
   preview request from the session tracks **the same way `preview/route.ts:68-80` does** (so the
   fresh preview ↔ effects trackUrl relationship is identical to the current working flow — no new
   inconsistency; note `buildAdvancedTrackData` uses `t.roexUploadUrl`, the original preview used
   `resolveTrackUrl(t)`; replicate the original):
   ```ts
   const freshTracks: MixTrackInput[] = tracks.map((t) => {
     const trackUrl = resolveTrackUrl(t);
     if (!trackUrl) throw new Error(`Stem URL expired for "${t.originalFilename}". Please re-upload your stems.`);
     return {
       trackUrl,
       instrumentGroup: mapInstrumentGroup(t.instrumentGroup) as MixTrackInput['instrumentGroup'],
       presenceSetting: t.presenceSetting as MixTrackInput['presenceSetting'],
       panPreference: t.panPreference as MixTrackInput['panPreference'],
       reverbPreference: t.reverbPreference as MixTrackInput['reverbPreference'],
     };
   });
   const roexStyle = mapMusicalStyle(sessionRow.musicalStyle);
   submit = async () => {
     const client = createRoExClient();
     const fresh = await mixPreview(client, { tracks: freshTracks, musicalStyle: roexStyle as never, returnStems: false });
     if (!fresh.taskId) throw new Error('Failed to mint a fresh mix task');
     chargedTaskId = fresh.taskId;               // capture for the task-row insert (see step 3)
     return mixFinalAdvanced(client, { taskId: fresh.taskId, trackData: advancedTrackData, returnStems: !sessionRow.isFreeCampaign });
   };
   ```
3. **★Save the FRESH task id on the dial_task** (critical): the task insert (`~:283`) currently saves
   `roexTaskId: previewTask.roexTaskId`. The poll/webhook paths re-retrieve by `task.roexTaskId`, so it
   MUST be the charged (fresh) id, not the preview's. Add `let chargedTaskId = previewTask.roexTaskId;`
   before the submit builders (default for dev/omakase), set it inside the isAdvanced submit, and change
   the insert to `roexTaskId: chargedTaskId`. (mixResult.taskId also echoes fresh.taskId, but capture
   explicitly to avoid the "save the charge id, not mixResult.taskId" trap noted at `:279-283`.)
4. **No dial_task for the fresh preview** — we only use its roexTaskId; do NOT insert a preview row.
   This auto-hides the intermediate preview (no extra take in `session-takes.ts`).

### ★Large-session latency (MUST verify — experiment only tested small/fast 16s input)
For 9-stem sessions a render is 8-22min. `mixFinalAdvanced` (submit, no comm-timeout) may BLOCK for
the full render → the final POST exceeds `maxDuration=300s` → Vercel kills it → task insert (after
submit) never runs → **orphaned charge** (charged, no task row to poll/reconcile).
- Verify how `/retrievefinalmix` behaves on a fresh task for a large session: returns `processing`
  quickly (then polled) vs blocks. Run the experiment with the full 9-stem set if needed.
- If it blocks: restructure so the task row is created BEFORE/independent of the blocking submit (mirror
  the reserve-before-charge ordering, or rely on the webhook + #434 reconcile cron to adopt the orphan).
  The existing #434 poll/backstop/cron must be able to find and complete the task.

## detect-and-regen optimization (conductor: include if effects-hash is cheap)
Avoid re-charging a no-op re-check (user clicks generate without changing params → with always-fresh
they pay for a slightly-different non-deterministic render; experiment showed C≠D for same effects).
- Compute a stable hash of `paramChanges` (sorted JSON). Compare to the last render's hash for this
  session (store the hash on the dial_task — small column or in an existing JSON field).
- Same hash → return the existing completed final task's result (no new mint/charge).
- Different hash → mint fresh + render (the core fix above), store new hash.
- If the storage/compare adds too much surface, ship correctness-first (always-fresh) and do this as a
  fast-follow (cost is bounded by baseCycleLimit=3).

## Tests / evidence (character gate)
- **Before/after audio**: reuse the experiment — A==B (cached old audio, the bug) vs C≠B (fresh new
  audio, the fix). Attach md5s + (optionally) short WAV clips to the PR.
- Re-run the experiment-style check AFTER the fix is wired through the app endpoints (a real
  session: 2 mix_checks with different Hoo params → confirm the 2nd is audibly different, not cached).
- Unit: the fresh-task minting path; baseCycleLimit=3 gate (mix_check×2+final allowed, over-limit 402/400).
- typecheck/lint/build/unit green.

## PR
Tier3 → product(2g7xrfai) review → conductor merge. ⑤ fix makes #461 free15-full actually work
(today free's 2nd render is also cached old audio). Canonical cost model update coordinated w/ freee.
