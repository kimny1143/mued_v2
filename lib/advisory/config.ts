//
// MUED advisory publish gate (staged storefront).
//
// false = STAGED: LP is noindex, absent from sitemap.ts / llms.txt, and the
//         tokushoho "MUED advisory" section is hidden. The LP page itself is still
//         reachable by direct URL for review (like the ai-mixing precedent), but is
//         not discoverable/announced. CTA = mailto stub (#8 swaps to its booking flow).
//
// true  = LIVE: flipped ONLY in the kimny-gated unlock PR (after the two pre-publish
//         blockers clear — GitHub=(B) is already folded into the copy, and 特商法 values
//         are finalized). Flipping this single constant atomically:
//           - un-noindexes app/[locale]/advisory/page.tsx  (robots.index = ADVISORY_LIVE)
//           - adds advisory URLs to app/sitemap.ts          (gated on ADVISORY_LIVE)
//           - adds advisory to app/llms.txt/route.ts        (gated on ADVISORY_LIVE)
//           - reveals the tokushoho "MUED advisory" section (gated on ADVISORY_LIVE)
//         The CTA (mailto -> #8 booking flow) is swapped separately by advisory #8.
//
// Spec: _contents-writing/drafts/inbox/advisory-lp-v7-plan-brief-20260702.md (§5, §5b).
// Unlock flow: pre-publish 2 points clear -> conductor verify -> kimny irreversible gate.
export const ADVISORY_LIVE = true;
