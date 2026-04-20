# MUEDial i18n Survey — 2026-04-20

## Executive Summary

MUEDial uses **next-intl v4.7.0** with `messages/{en,ja}.json` as the source of truth. The infrastructure is solid, but **21 user-facing hardcoded strings** have been identified in the dial session UI, landing page, and player components that bypass the i18n system.

---

## 1. Hardcoded String Inventory

**Total hardcoded user-facing strings: 21**

### Session Management (`app/dial/session/[id]/page.tsx`)

| File:Line | String | Type |
|-----------|--------|------|
| ~960 | `'This session may have expired.'` | Requires translation |
| ~1024 | `'+ Add Files'` | Requires translation |
| ~1042 | `'File'` (table header) | Requires translation |
| ~1086 | `'{n} file{s} ready'` | Requires translation (plural) |
| ~1096 | `'Upload All ({count})'` | Requires translation |
| ~1127 | `'Mix Check'` | Requires translation |
| ~1129 | `'Master Preview'` | Requires translation |
| ~1131 | `'Master Final'` | Requires translation |
| ~1177 | `'Download Mix Check (.wav)'` | Requires translation |
| ~1179 | `'Download Mastered Track (.wav)'` | Requires translation |
| ~1198 | `'Mix Results'` | Requires translation |
| ~913–918 | Processing labels (5 variants) | Requires translation |
| ~1009 | Japanese confirm dialog (stem guard) | Hardcoded JA only — needs EN |

### Player Components

| File:Line | String | Type |
|-----------|--------|------|
| `unified-session-player.tsx:~326` | `'Original stems not available.'` | Requires translation |
| `unified-session-player.tsx:~326` | `'Stem tracks available after dialogue mix.'` | Requires translation |
| `v2/unified-session-player-v2.tsx:~83` | `'Return to start'` | Requires translation |

### Landing Page & Upload

| File:Line | String | Type |
|-----------|--------|------|
| `app/dial/page.tsx:~24` | `'Mixing Assistant'` | **Bug: key `t.dial.chat.mixingAssistant` already exists but unused** |
| `app/dial/page.tsx:~45` | `'Preview updated'` | Requires translation |
| `components/dial/reference-track.tsx:~202` | `'Upload failed'` | Requires translation |

---

## 2. Audio Technical Terms — Skip Translation

These are audio industry standards and should NOT be translated:

| Term | Usage |
|------|-------|
| LUFS, MOMENTARY, INTEGRATED, SHORT-TERM | Loudness measurement labels |
| RAW, MIXED, MASTERED | Take stage enums |
| NORMAL, LEAD, BACKGROUND | Presence enum |
| NO_PREFERENCE, LEFT, CENTRE, RIGHT | Pan enum |
| NONE, LOW, MEDIUM, HIGH | Reverb enum |

---

## 3. i18n Infrastructure

### Configuration
- **Library:** `next-intl` v4.7.0
- **Locales:** `['ja', 'en']`
- **Config:** `lib/i18n/config.ts`
- **Message files:** `messages/{en,ja}.json`
- **Request handler:** `lib/i18n/request.ts` (server-side)
- **Client context:** `lib/i18n/locale-context.tsx` (`localStorage` + cookie)

### Dial Namespace — Already Covered

| Namespace | Keys |
|-----------|------|
| `dial.analyzer.*` | 9 keys |
| `dial.chat.*` | 29 keys |
| `dial.checkout.*` | 13 keys |
| `dial.creditsBalance.*` | 6 keys |
| `dial.dashboard.*` | 18 keys |
| `dial.lp.*` | 25+ keys |
| `dial.pricing.*` | 21 keys |
| `dial.session.*` | 15 keys |
| `dial.stemPanel.*` | 9 keys |

**Gap:** Task labels, processing statuses, file upload UI, download buttons, player error messages.

### Access Pattern in Components

```typescript
const { t } = useLocale();
const s = t.dial.session;  // direct property access
```

This pattern (not `useTranslations` hook) works uniformly across server and client components.

---

## 4. Missing Keys — Full List (21)

To be added to `messages/en.json` and `messages/ja.json`:

```jsonc
// dial.session additions
"addFiles": "+ Add Files",
"fileTableHeader": "File",
"filesReadyOne": "1 file ready",
"filesReadyMany": "{count} files ready",
"uploadAllButton": "Upload All ({count})",
"mixCheckLabel": "Mix Check",
"masterPreviewLabel": "Master Preview",
"masterFinalLabel": "Master Final",
"downloadMixCheckWav": "Download Mix Check (.wav)",
"downloadMasteredTrackWav": "Download Mastered Track (.wav)",
"mixResultsTitle": "Mix Results",
"statusProcessing": "Processing…",
"statusMixCheckProcessing": "Mix Check processing…",
"statusFinalMixGenerating": "Final mix generating…",
"statusMasteringPreviewGenerating": "Mastering preview generating…",
"statusMasteringFinalGenerating": "Final master generating…",
"sessionExpiredFallback": "This session may have expired.",
"originalStemsNotAvailable": "Original stems not available.",
"stemTracksAvailableAfterDialogue": "Stem tracks available after dialogue mix.",
"stemDownloadGuard": "Stem files have not been downloaded yet. Leaving will make them unavailable. Continue?",
"returnToStart": "Return to start",

// dial.lp additions
"previewUpdatedBadge": "Preview updated",

// bug fix — already exists in en.json but unused in app/dial/page.tsx:~24
// "mixingAssistant" key exists under dial.chat — just wire it up
```

---

## 5. Work Breakdown

### Phase 1 — Add Missing Keys (1 PR)
**Files:** `messages/en.json`, `messages/ja.json`
- +21–22 keys per file
- ~35 lines added per file
- Tier 1 (data files only) — self-merge after CI

### Phase 2 — Replace Hardcoded Strings (1–2 PRs)
**Files:**
- `app/dial/session/[id]/page.tsx` (12–13 replacements)
- `components/dial/unified-session-player.tsx` (2 replacements)
- `components/dial/v2/unified-session-player-v2.tsx` (1 replacement)
- `app/dial/page.tsx` (2 replacements incl. bug fix)
- `components/dial/reference-track.tsx` (1 replacement)
- 5+ files → Tier 2, native課レビュー

### Phase 3 — Polish (1 PR)
- Pluralization helper for file count
- Audit all `title=` / `aria-label=` for hardcoded strings
- Replace hardcoded JA confirm dialog with i18n (incl. EN)
- Tier 2, native課レビュー

---

## 6. Bugs Found

1. **`app/dial/page.tsx:~24`** — `<span>Mixing Assistant</span>` hardcoded. Key `t.dial.chat.mixingAssistant` already exists in `messages/en.json` but is not wired up. Fix is 1 line.

2. **`app/dial/session/[id]/page.tsx:~1009`** — confirm dialog text is Japanese only. English equivalent missing from messages files.

---

## 7. Scope Boundary

This survey covers **MUEDial (`app/dial/*`, `components/dial/*`)** only, per kimny指示「MUEDial全体」.
MUEDear / MUEDnote / common navigation / footer / auth pages are out of scope and will be addressed in separate PRs.

---

## 8. Recommendations

**Phase 1 (now — Tier 1, self-merge):**
1. Add 21 missing keys to `messages/en.json` + `messages/ja.json`

**Phase 2 (after Phase 1 merge — Tier 2, native課レビュー):**
1. Replace hardcoded strings in session/player components
2. Fix `dial/page.tsx` `mixingAssistant` bug (1-line)

**Phase 3 (polish — Tier 2, native課レビュー):**
1. Pluralization helper for file count
2. Migrate JA-only confirm dialog to i18n (incl. EN)
3. Accessibility attribute (`title=`, `aria-label=`) audit

**Phase 4 — Hoo Response Language (Future, separate PR):**

Hoo currently responds in Japanese via prompt engineering. When EN locale users use MUEDial, UI strings will be in English but Hoo's chat responses will remain Japanese — creating a language mismatch.

Two options:
- **案A (recommended):** Dynamically switch Hoo's system prompt language based on user locale. EN locale → EN Hoo prompt; JA locale → JA Hoo prompt.
- **案B (minimal):** UI-only i18n, Hoo stays JA. EN users experience mixed-language UX.

**Decision: Phase 1–3 covers UI strings only. Hoo response language is Phase 4 (separate PR, requires Hoo prompt engineering + testing).**

This decoupling prevents Phase 1–3 from blocking on the more complex Hoo behavior change.

---

*Surveyed by mued課 · 2026-04-20 · conductor approved 2026-04-20 · Phase 4 Hoo language policy added*
