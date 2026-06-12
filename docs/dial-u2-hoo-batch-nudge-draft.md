# U2 — Hoo "batch your tweaks" nudge (fast-follow draft, post-#463-merge)

Part of the ⑤ correctness package (kimny 4-point set). U2 = a Hoo conversational nudge that reduces
the number of multi-minute rebuilds (= less wait + RoEx cost) now that each Mix Check renders fresh.
Conductor: near-term fast-follow (NOT backlog), separate PR after #463 merges, **canonical
notification** to write/content課 to consider (Hoo behavior change), and conductor voice-check on the
copy (like U3; kimny final not needed).

## Where
`lib/ai/prompts/dial.ts` — Phase 2 section (~L458-465) and/or the tool-usage rules (~L486-501). The
prompt ALREADY has the "フィードバック収集の鉄則" (gather all feedback, adjust in one shot) spirit at
Phase 2/3; U2 only adds the NEW *why* (each Mix Check rebuilds the whole mix → minutes) and steers
exploration into the free Phase 1 preview.

## Draft addition (Phase 2, after "ここからは有料のため…十分に要望を聞いてから提案する。")
> **各 Mix Check はミックス全体を作り直すため、生成のたびに数分かかる。** だから「気になる点を全部
> 出してもらってから1回でまとめて提案する」のが特に大事。細かい調整を1つずつ Mix Check で試すのでは
> なく、方向性は **Phase 1 の無料プレビュー**（presence/pan/reverb は何度でも無料）で固めてもらい、
> 変えたい点が出揃ってから Mix Check に進むよう自然に促す。
> 例:「無料のプレビューで方向を固めてから本格ミックスにいくと、待ち時間も少なくて済むよ」

EN player-facing tone is via the existing localized status copy (U3); this nudge is Hoo's
conversational behavior (model-side, JA system prompt). Keep it brief — don't lecture; one natural
sentence at the Phase 1→2 transition.

## Verify / gate
- Re-run dial prompt unit tests (`tests/unit/lib/ai/prompts/dial.test.ts`) — the addition is prose,
  but confirm no assertion on prompt length/markers breaks.
- typecheck/lint/build green. Tier2 (prompt copy, no billing/route change) → peer review.
- **Canonical notification**: per `.claude/rules/write-notification.md`, a Hoo behavior/spec nudge
  may touch canonical product voice — notify write/content課 (over-notify side). Likely "軽微"
  (internal nudge, no public pricing/spec change) → log-only, but confirm.
