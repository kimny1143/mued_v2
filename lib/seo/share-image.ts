/**
 * The one share-card image for every page (og:image / twitter:image).
 *
 * ★Next.js REPLACES the layout's openGraph / twitter with the page's own object (it does not merge), so a
 * page that sets openGraph or twitter without `images` loses the layout's image and shares as a card with
 * no picture (CCO #1187/#1188, measured on prod 2026-10-01). Every page that sets either must pass this.
 */
export const SHARE_IMAGE = {
  url: "/og-image.jpg",
  width: 1200,
  height: 630,
  alt: "MUED — 音楽制作の道具",
} as const;

export const SHARE_IMAGES = [SHARE_IMAGE];
