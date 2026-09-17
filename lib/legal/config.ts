// Same staging mechanism as lib/learn/config.ts: the route stays directly previewable while false,
// but is noindex and absent from the sitemap. This module is server-only by usage; the server page
// passes the resolved boolean into the purchase client component.
export const EULA_LIVE = process.env.EULA_LIVE === "1";
