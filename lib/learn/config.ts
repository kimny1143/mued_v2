//
// Staged flag for the /learn EN reference track (Road to 10k 層2 #8). While false, the pages still
// render (so conductor/kimny can preview at the URL for the pre-publish tone gate), but they are
// noindex + absent from the sitemap — NOT public. kimny flips LEARN_LIVE=true in Vercel at go-live,
// after content writes the pillar + real internal links and the tone gate passes. Same staging doctrine
// as MUEDSAT_LIVE / MUEDSP_LIVE.
//
export const LEARN_LIVE = process.env.LEARN_LIVE === "true";
