//
// MUEDsp product-page publish gate (staged).
//
// Mirrors lib/muedsat/config.ts (MUEDSAT_LIVE) and lib/advisory/config.ts (ADVISORY_LIVE) —
// the go-live pattern proven on both: one constant that isolates every discoverability surface
// so publish is a single atomic flip.
//
// /muedsp is the MUEDsp plugin-line brand page (the umbrella above the free MUEDsat saturator and
// the in-development MUEDsp masterchain flagship). It is the wave1 redesign deliverable, built as a
// STAGED mock for the kimny 現物 gate — reachable by direct URL for review, but undiscoverable.
//
// false = STAGED: the page is noindex, absent from sitemap.ts / llms.txt, and NOT linked from nav.
//         Still reachable by direct URL for the preview gate (muedsat / advisory precedent).
//
// true  = LIVE: flipped ONLY in the kimny-gated unlock PR (conductor executes) once the redesign
//         is approved and MUEDsp is ready to announce.
export const MUEDSP_LIVE = false;
