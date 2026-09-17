// Same staging mechanism as lib/learn/config.ts: the route stays directly previewable while false,
// but is noindex and absent from the sitemap. This module is server-only by usage. The client-side
// consent gate separately reads build-inlined NEXT_PUBLIC_EULA_LIVE in its client component.
export const EULA_LIVE = process.env.EULA_LIVE === "1";
