# MUEDial dial-screen mobile (iPhone) responsive — plan of record (2026-06-18)

kimny checks the MUEDial session screen on iPhone frequently, but it was a PC-only fixed layout
(effectively unusable on mobile). Scope (kimny GO): **functional responsive** — mobile-first /
breakpoint, not a hack, not a full redesign. Reviewed by conductor, mixer + layout pattern approved
by kimny.

## Strategy

**Mobile-first base + `lg:` additive to restore the desktop layout** — so desktop (lg+) is not
regressed; the mobile behavior is purely additive below `lg`.

## Implemented changes

| File | Change |
|---|---|
| `app/layout.tsx` | Explicit `viewport` export (`width=device-width`, `initialScale=1`; pinch-zoom left enabled). |
| `app/dial/session/[id]/page.tsx` | **Mobile tab bar** `[Chat \| Player]` (default **Chat** — the primary "director's seat" tool). Below `lg`, only the active tab's panel shows; on `lg+` the tab bar is `lg:hidden` and both panels show side-by-side (Player `flex-1` + Chat `w-[440px]`) — unchanged desktop. Root height `h-screen` → `h-[100dvh]` (iPhone Safari toolbar-safe). |
| `components/dial/v2/stem-panel.tsx` | **Mixer = (b) per-stem accordion** (kimny's choice). `lg+`: the 8-column console (unchanged). Below `lg`: a collapsed header (color / name / peak / M / S / chevron, ≥52px tap row) that taps to expand full-width Pan + Volume controls + waveform. One stem open at a time (`expandedId`). Inner scroll cap is `lg:`-only (mobile flows in the page scroll — no nested scroll). |
| `components/dial/v2/take-pills.tsx` | `grid-cols-3` → `grid-cols-1 lg:grid-cols-3` (mobile stacks RAW/MIXED/MASTERED full-width; dividers flip `divide-x`→`divide-y` below `lg`). Avoids the 2+1 orphan. |
| `components/dial/v2/analyzer.tsx` | The fixed 4-column meter row (`1fr 92px 280px 180px` ≈ 552px) → `grid-cols-1 lg:[grid-template-columns:…]` (stacks on mobile, original on `lg+`). |
| `components/dial/v2/chat.tsx` | Tap targets: input gets **16px font on mobile** (prevents iOS Safari auto-zoom on focus) + ≥44px height; Send + Generate (Final/Mastering/MixCheck) buttons ≥44px. Desktop sizes unchanged via `lg:`. |

## Acceptance criteria (per conductor)

1. **No horizontal overflow** (390 / 430px): container is tab-switched (one full-width panel), mixer
   folds to the accordion, take-pills/analyzer stack — nothing exceeds the viewport.
2. **Operable**: chat (≥44px input/buttons, no iOS zoom), player, mixer (accordion full-width
   controls), action buttons (Generate Final etc. ≥44px).
3. **Desktop (lg+) not regressed**: every change is mobile-first base + `lg:` restore.
4. **Tap ~44px / readable labels**: interactive elements ≥44px where practical.

## Verification

- `npm run typecheck` / `eslint` / `npm run build` — all clean.
- Breakpoints to check (DevTools 390 / 430 / 768 / 1024 / 1440): no horizontal scroll, controls reachable.
- **Character gate**: kimny iPhone real-device E2E (actual finger operation) — the final sign-off.

## Fast-follow items (NOT in this PR — tracked for later dispatch)

- **Now-playing bar** (kimny-approved deferral): a sticky compact player (current take + play/pause +
  scrub) in the Chat tab so the listen↔direct loop doesn't require a tab-switch every cycle. v1 ships
  plain tabs; this is the polish for MUEDial's core loop.
- **v2 player internal 2-col** (`unified-session-player-v2.tsx`): it has a `flex` + `w-[440px]` chat
  column **only when `chatProps` is passed** — which the session screen does NOT do (it renders the
  player and `ChatPanelV2` separately). So it's **dormant** in the current screen (not an overflow
  source). Make it `flex-col lg:flex-row` + `w-full lg:w-[440px]` if/when the chat-in-player cutover
  lands.
- **Mixer M/S toggles** to a full ≥44px tap area on mobile (currently the shared 28px `ToggleSquare`);
  and the mobile **level meter** (omitted from the accordion body for compactness).
- **Analyzer** per-panel divider polish on the stacked mobile layout.

## Tier / flow

Tier 2 (UI code, no schema/payment). Review = product課 → conductor independent check → merge →
kimny iPhone real-device E2E.
