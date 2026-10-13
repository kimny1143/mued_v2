/**
 * ★The short-link table. One row = one short link. This file is the whole "management console":
 * changing where an article points is a one-line edit here plus a deploy, and the article is never
 * touched again.
 *
 * ★It lives in git on purpose. A settings screen somewhere would satisfy "the destination is
 * configurable" while making the mapping unmeasurable from the repo — nobody could diff it, review
 * it, or ask "which 60 links point at /dial today" without logging in somewhere.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ★How to add a row (the porting contract)
 *
 *   { slug: '…', path: '/dial', utmSource: 'note', utmMedium: '…', utmCampaign: '…', utmContent: '…' },
 *
 *   - `slug`        opaque and permanent. Once an article ships with it, it is a public URL —
 *                   ★changing a slug breaks a published article. Retire by repointing, never rename.
 *   - `path`        `''` = the bare host. NEVER a full URL (the host comes from ALLOWED_HOSTS).
 *   - `utmContent`  ★copied verbatim from the article link this row replaces. Never re-numbered:
 *                   a new value splits that link's clicks into two GA4 series, and nothing fails.
 *   - `host`        omit for `dial.mued.jp`.
 *
 * ★Rows are validated by tests/unit/short-links/resolve.test.ts (unique slug, allowlisted host,
 * path shape, no empty utm field). A malformed row fails CI rather than redirecting somewhere odd.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ★Scope this table is being populated for (conductor, measured 2026-08-29 against
 * `drafts/published/*.md` on origin/main of the articles repo):
 *
 *     ★dial.mued.jp 宛のリンク  ★62     ← the rows below
 *
 *     ★60 vs 62 IS A LAYER DIFFERENCE, NOT A MISS — corrected 2026-08-29 after it had already been
 *     written up (twice) as "the first port was two short". Measured over the same drafts:
 *         markdown links `](…)` to dial   ★60   ← conductor's original count. ★Correct for links.
 *         ALL URL occurrences to dial     ★62   ← product課's and this repo's predicate
 *         the difference                  ★2    ← ★BARE URLs, not links at all
 *     ★Both extras are exactly the two rows added later (`ai_dependency_risk`, `muedear_270_sounds`).
 *     ★So no one measured wrongly; the two counts answer different questions, and "two short" named
 *     the wrong party. On note's live pages one of the two IS a real <a> (note linked it) and the
 *     other is still plain text — see the comment on those rows.
 *     ★The table is a strict superset of the links and a strict subset of the URL occurrences, and
 *     the corpus↔table match is 0/0 in both directions under the URL-occurrence predicate.
 *     ★The completeness of this table cannot be checked from THIS repo: the corpus lives in
 *     _contents-writing. Every count below is therefore a measurement someone made elsewhere, and
 *     `verify:short-links` can only prove the rows here resolve — never that a row is missing.
 *
 *     ★"Cannot be checked from here" is not "cannot be checked". ★HOW TO RE-VERIFY (product課 asked
 *     that the limitation be written as a procedure, since 60→62 was found by someone doing exactly
 *     this):
 *       正本  : _contents-writing の `drafts/published/*.md`, on origin/main (confirm 0/0 first)
 *       述語  : strip code fences → extract `https?://[^\s)>\]"'`]+` → urlparse, host == 'dial.mued.jp'
 *       突合  : ★BOTH directions — 記事→表 AND 表→記事 must each be 0. ★One direction cannot tell you
 *               whether adding the difference closes it; the 60→62 fix was only safe to make because
 *               "in the table but not in the corpus" was also measured, and was 0.
 *       副産物: the count of empty utm_content links = step 1 of the ratchet in
 *               tests/unit/short-links/resolve.test.ts.
 *     path の異なり              5      bare 30 / `/` 16 / `/dial` 12 / `/waitlist` 1 / `/readiness` 1
 *
 *     ★utm_content の異なり — ★TWO axes move the number, so state both. There is no single answer:
 *         axis ① does an ABSENT utm_content count as one value?
 *         axis ② is the host population restricted to the mued.jp family?
 *
 *                          ①counted   ①not counted
 *           dial only         ★40          ★39        ← the rows below; ★verified here: 40 / 39 / 19 empty
 *           mued family       43           42
 *           ★host unrestricted 44          ★44        ← +2 from apps.apple.com (muedear / muednote)
 *
 *         ★a naive `utm_content=[^&]*` grep gives 47 — the markdown link's closing `)` splits values.
 *
 *       ★Only the "dial only" row is measured here; the others are conductor's and content課's counts
 *       over the article corpus, which is not in this repo. ★Attributed rather than restated as ours.
 *       ★When writing "全体", say what it is the whole of — that omission is what made 43 and 44 look
 *       like a contradiction for half a day.
 *
 * ★THIS HEADER FIRST SAID "44", THEN "★correct is 40". ★Both framings were wrong in the same way.
 *   44 was a real measurement under a different predicate (content課), and writing "correct is 40"
 *   would make the next person who measures 44 conclude the retraction was the error. ★What moved was
 *   the predicate — whether an empty value counts — not the answer. content課's wording, kept verbatim
 *   because it is the lesson: 「『正しい値は 43』と書くと、次に別の述語で測った人が 44 を出して、
 *   取り下げが誤りだったと読みます」。
 *   ★The row count (60) is unaffected by any of this: rows are the distinct (campaign, content) pairs,
 *   which does not depend on how utm_content alone is tallied.
 *   - ★"60" was never host-scoped. The 60 published articles carry ★110 mued-family links: ★60 to
 *     dial.mued.jp (these) and ★50 to mued.jp (48 of them utm-tagged) that nobody had counted.
 *     ALLOWED_HOSTS already accepts mued.jp, so the table can hold them — whether to port them is a
 *     separate decision, raised with SNS課 / content課. ★They are NOT in the rows below.
 *
 * ★60 vs 44 is a real choice and it is NOT "pick the smaller number": collapsing to 44 keys forces
 * every link sharing a `utm_content` onto ONE destination, and the measured path spread (5 kinds)
 * says they do not all share one. ★The key that preserves today's behaviour is the distinct
 * (host, path, utm tuple) — somewhere between 44 and 60. Port at that granularity and let the row
 * count fall out; do not round it to either end.
 */
import type { ShortLink } from './resolve';

export const SHORT_LINKS: readonly ShortLink[] = [
  // ★Ported verbatim from conductor's measurement (_conductor docs/handoff/short-links-porting-20260829.md,
  //   PR #2426). Row identity = the distinct (host, path, utm) tuple, which measured 60 — NOT rounded to
  //   the 40 distinct utm_content values, which would have forced links with different paths onto one
  //   destination. `(utm_campaign, utm_content)` is unique across all 60, and that pair is what
  //   validateTable() enforces.
  //
  // ★19 rows carry an EMPTY utmContent because their source links never had one. That is copied as-is:
  //   inventing a value would split a live GA4 `(not set)` bucket into 19 new keys, which is the
  //   re-numbering condition ② forbids. All 19 have distinct campaigns, so they stay distinguishable.
  //
  // ★slug is derived from the ARTICLE name, not the destination — a slug is a published URL, so it must
  //   survive a repoint. `zenn_` is kept as a prefix because dropping both prefixes collided
  //   article_stem_to_master with zenn_stem_to_master (conductor caught and fixed this).
  { slug: '24h-operation', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: '24h_operation', utmContent: '' },
  { slug: '32pr-day', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: '32pr_day', utmContent: '' },
  { slug: 'ai-critique-judgment', path: '/dial', utmSource: 'note', utmMedium: 'article', utmCampaign: 'ai_critique_judgment', utmContent: 'article_ai_critique_judgment' },
  // ★These two came from BARE URLs in the draft, not markdown links — see the "60 vs 62" note in the
  //   header. On note's live pages (conductor, 2026-08-29): `muedear_270_sounds` IS a real <a> (note
  //   auto-linked it), while ★`ai_dependency_risk` is plain text there too — that article carries no
  //   <a href> at all, so its CTA is not clickable. ★Kept anyway: the row costs nothing (an unused
  //   slug), and it is what content課 will need the moment that CTA becomes a link. ★Do not delete it
  //   as "a row with no live link" — that is a known state, recorded here, not a drift.
  { slug: 'ai-dependency-risk', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'ai_dependency_risk', utmContent: '' },
  { slug: 'ai-detector-worldview', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'ai_detector_worldview', utmContent: '' },
  { slug: 'ai-detour-connected', path: '/dial', utmSource: 'note', utmMedium: 'article', utmCampaign: 'ai_detour_connected', utmContent: 'article_ai_detour_connected' },
  { slug: 'ai-groove-moving-boundary', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'ai_groove_moving_boundary', utmContent: '' },
  { slug: 'ai-mixing-comparison-2026', path: '/dial', utmSource: 'note', utmMedium: 'article', utmCampaign: 'cat3_seo', utmContent: 'article_ai_mixing_comparison' },
  { slug: 'ai-provenance-connection', path: '/dial', utmSource: 'note', utmMedium: 'article', utmCampaign: 'ai_provenance_connection', utmContent: 'article_ai_provenance_connection' },
  { slug: 'ai-reference-track-quit', path: '/dial', utmSource: 'note', utmMedium: 'article', utmCampaign: 'ai_reference_track_quit', utmContent: 'article_ai_reference_track_quit' },
  { slug: 'ai-signature-language', path: '/dial', utmSource: 'note', utmMedium: 'article', utmCampaign: 'ai_signature_language', utmContent: 'article_ai_signature_language' },
  { slug: 'ai-subordinates', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'ai_subordinates', utmContent: '' },
  { slug: 'ai-traces-are-material', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'ai_traces_are_material', utmContent: '' },
  { slug: 'auto-memory-experience', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'auto_memory_experience', utmContent: '' },
  { slug: 'claudemd-bugs', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'claudemd_bugs', utmContent: '' },
  { slug: 'conductor-coordination', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'conductor_coordination', utmContent: '' },
  { slug: 'creator-desire-principle', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'creator_desire_principle', utmContent: '' },
  { slug: 'creator-time-protect', path: '/', utmSource: 'note', utmMedium: 'article', utmCampaign: 'creator_time_protect', utmContent: 'creator_time_protect' },
  { slug: 'daw-user-handoff-2026', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'cat3_seo', utmContent: 'article_daw_user_handoff_2026' },
  { slug: 'deadline-decides-done', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'cat3_seo', utmContent: 'article_deadline_decides_done' },
  { slug: 'dtm-judgment-load', path: '/', utmSource: 'note', utmMedium: 'article', utmCampaign: 'cat3_seo', utmContent: 'dtm_judgment_load' },
  { slug: 'ear-stamina', path: '/', utmSource: 'note', utmMedium: 'article', utmCampaign: 'cat3_seo', utmContent: 'ear_stamina' },
  { slug: 'finishing-means-letting-go-2026', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'cat3_seo', utmContent: 'article_finishing_means_letting_go_2026' },
  { slug: 'first-touch', path: '/dial', utmSource: 'note', utmMedium: 'article', utmCampaign: 'first_touch', utmContent: 'article_first_touch' },
  { slug: 'headphone-speaker-switch', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'cat3_seo', utmContent: 'article_headphone_speaker_switch' },
  { slug: 'hoo-personality-design', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'hoo_personality_design', utmContent: '' },
  { slug: 'hoo-tone-maintenance', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'hoo_tone_maintenance', utmContent: '' },
  { slug: 'loudness-perception-trap-2026', path: '/dial', utmSource: 'note', utmMedium: 'article', utmCampaign: 'cat3_seo', utmContent: 'article_loudness' },
  { slug: 'low-end-room-dependency', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'cat3_seo', utmContent: 'article_low_end_room_dependency' },
  { slug: 'lufs-streaming-alignment-2026', path: '/dial', utmSource: 'note', utmMedium: 'article', utmCampaign: 'cat3_seo', utmContent: 'article_lufs' },
  { slug: 'mode-separation', path: '/', utmSource: 'note', utmMedium: 'article', utmCampaign: 'cat3_seo', utmContent: 'mode_separation' },
  { slug: 'monitor-change-judgment', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'cat3_seo', utmContent: 'article_monitor_change_judgment' },
  { slug: 'mued-22months-part1', path: '/', utmSource: 'note', utmMedium: 'article', utmCampaign: 'mued_22months_part1', utmContent: 'mued_22months_part1' },
  { slug: 'mued-22months-part2', path: '/', utmSource: 'note', utmMedium: 'article', utmCampaign: 'mued_22months_part2', utmContent: 'mued_22months_part2' },
  { slug: 'muedear-270-sounds', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'muedear_270_sounds', utmContent: '' },
  { slug: 'muedear-v0912-update', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'muedear-v0912-update', utmContent: '' },
  { slug: 'muedial-research-beta-launch-1', path: '/readiness', utmSource: 'note', utmMedium: 'article', utmCampaign: 'muedial_readiness', utmContent: 'research_beta_launch_20260513' },
  { slug: 'muedial-research-beta-launch-2', path: '/', utmSource: 'note', utmMedium: 'article', utmCampaign: 'ai_mix_request', utmContent: 'research_beta_launch_20260513' },
  { slug: 'muedial-research-beta-launch-3', path: '/waitlist', utmSource: 'note', utmMedium: 'article', utmCampaign: 'research_beta_launch_20260513', utmContent: 'research_beta_launch_20260513' },
  { slug: 'muedsp-plugin-journey', path: '/dial', utmSource: 'note', utmMedium: 'article', utmCampaign: 'muedsp_plugin_journey', utmContent: 'article_muedsp_plugin_journey' },
  { slug: 'non-engineer-ceo', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'non_engineer_ceo', utmContent: '' },
  { slug: 'permission-mode-auto', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'permission_mode_auto', utmContent: '' },
  { slug: 'permission-prompt-elimination', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'permission_prompt_elimination', utmContent: '' },
  { slug: 'release-corridor', path: '/', utmSource: 'note', utmMedium: 'article', utmCampaign: 'cat3_seo', utmContent: 'release_corridor' },
  { slug: 'room-acoustic-diy-ep1', path: '/', utmSource: 'note', utmMedium: 'article', utmCampaign: 'cat3_seo', utmContent: 'room_acoustic_diy_ep1' },
  { slug: 'room-acoustic-diy-ep2', path: '/', utmSource: 'note', utmMedium: 'article', utmCampaign: 'cat3_seo', utmContent: 'room_acoustic_diy_ep2' },
  { slug: 'room-acoustic-diy-ep3', path: '/', utmSource: 'note', utmMedium: 'article', utmCampaign: 'cat3_seo', utmContent: 'room_acoustic_diy_ep3' },
  { slug: 'room-acoustic-diy-ep4', path: '/', utmSource: 'note', utmMedium: 'article', utmCampaign: 'cat3_seo', utmContent: 'room_acoustic_diy_ep4' },
  { slug: 'sleep-on-the-mix', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'cat3_seo', utmContent: 'article_sleep_on_the_mix' },
  { slug: 'standup-design', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'standup_design', utmContent: '' },
  { slug: 'stem-to-master', path: '/dial', utmSource: 'note', utmMedium: 'article', utmCampaign: 'cat3_seo', utmContent: 'article_stem_to_master' },
  { slug: 'still-making-music', path: '/', utmSource: 'note', utmMedium: 'article', utmCampaign: 'still_making_music', utmContent: 'still_making_music' },
  { slug: 'suno-mix-guide-2026-1', path: '/', utmSource: 'note', utmMedium: 'article', utmCampaign: 'window-b', utmContent: 'suno-mix-guide' },
  { slug: 'suno-mix-guide-2026-2', path: '/dial', utmSource: 'note', utmMedium: 'article', utmCampaign: 'cat3_seo', utmContent: 'article_suno_mix_guide' },
  { slug: 'suno-studio-limits-2026-1', path: '/', utmSource: 'note', utmMedium: 'article', utmCampaign: 'window-b', utmContent: 'suno-studio-limits' },
  { slug: 'suno-studio-limits-2026-2', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'cat3_seo', utmContent: 'article_suno_studio_limits_2026' },
  { slug: 'tier-system-documentary', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'tier_system', utmContent: '' },
  { slug: 'udio-workflow-2026-1', path: '/', utmSource: 'note', utmMedium: 'article', utmCampaign: 'window-b', utmContent: 'udio-workflow' },
  { slug: 'udio-workflow-2026-2', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'cat3_seo', utmContent: 'article_udio_workflow_2026' },
  { slug: 'vocal-level-not-numbers', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'cat3_seo', utmContent: 'article_vocal_level_not_numbers' },
  { slug: 'vocal-mix-ai', path: '', utmSource: 'note', utmMedium: 'article', utmCampaign: 'cat3_seo', utmContent: 'article_vocal_mix_ai' },
  { slug: 'zenn-stem-to-master', path: '', utmSource: 'zenn', utmMedium: 'article', utmCampaign: 'stem_to_master', utmContent: '' },

  // ★The two buttons in the masterchain plugin UI (dsp 1.0.0, the "Demo expired" screen; conductor
  //   2026-09-28). ★These URLs are BAKED INTO A SHIPPED BINARY, so the slug can never change — only the
  //   row. ★mc-trial points at /en/muedsp until the trial sign-up page ships, then is repointed to it.
  //   EN because the plugin UI is English; repointing to a locale-aware page is a one-row change.
  //   ★2026-09-30: localeFromBrowser — a browser that prefers Japanese lands on /ja/muedsp (conductor).
  { slug: 'mc-trial', host: 'mued.jp', path: '/en/muedsp', utmSource: 'muedsp_plugin', utmMedium: 'inapp', utmCampaign: 'masterchain_trial', utmContent: 'demo_expired', localeFromBrowser: true },
  { slug: 'mc-buy', host: 'mued.jp', path: '/en/muedsp', utmSource: 'muedsp_plugin', utmMedium: 'inapp', utmCampaign: 'masterchain_buy', utmContent: 'demo_expired', localeFromBrowser: true },
  // ★Two more baked into masterchain 1.0.1 (dsp, conductor 2026-09-30) — same rule: the slug never changes.
  //   mc-plugin = the "mued.jp ↗" link at the top right (demo and licensed alike).
  //   mc-portal = "mued.jp portal" in the License window: where a buyer goes to get the key. The portal is
  //   /dashboard/plugins (no locale segment); signed out, the auth gate sends them to /sign-in and back here
  //   with the query intact (lib/middleware/sign-in-redirect.ts).
  // mc-buy-panel = "Buy masterchain ↗" in the License window opened from the DEMO badge (conductor 2026-09-30):
  //   same destination and campaign as mc-buy, a different utm_content so launch numbers can tell where a
  //   purchase started (mc-buy stays the DEMO EXPIRED screen's Buy = demo_expired).
  { slug: 'mc-buy-panel', host: 'mued.jp', path: '/en/muedsp', utmSource: 'muedsp_plugin', utmMedium: 'inapp', utmCampaign: 'masterchain_buy', utmContent: 'license_panel', localeFromBrowser: true },
  { slug: 'mc-plugin', host: 'mued.jp', path: '/en/muedsp', utmSource: 'muedsp_plugin', utmMedium: 'inapp', utmCampaign: 'masterchain_header', utmContent: 'header_link', localeFromBrowser: true },
  // mc-demo-mail = the product-page link in the masterchain demo receipt (conductor 2026-09-30, d).
  { slug: 'mc-demo-mail', host: 'mued.jp', path: '/en/muedsp', utmSource: 'email', utmMedium: 'lifecycle', utmCampaign: 'masterchain_demo_mail', utmContent: 'product_link', localeFromBrowser: true },
  // vox-demo-mail = the product-page link in the MUEDvox demo receipt (same shape as mc-demo-mail).
  { slug: 'vox-demo-mail', host: 'mued.jp', path: '/en/muedvox', utmSource: 'email', utmMedium: 'lifecycle', utmCampaign: 'muedvox_demo_mail', utmContent: 'product_link', localeFromBrowser: true },
  { slug: 'mc-portal', host: 'mued.jp', path: '/dashboard/plugins', utmSource: 'muedsp_plugin', utmMedium: 'inapp', utmCampaign: 'masterchain_portal', utmContent: 'license_window' },
] as const;
