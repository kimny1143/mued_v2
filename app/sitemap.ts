import { MetadataRoute } from 'next';

const MUED = 'https://mued.jp';
const DIAL = 'https://dial.mued.jp';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    // ── mued.jp ──────────────────────────────────────────────────
    { url: `${MUED}/en`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${MUED}/ja`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${MUED}/connect`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${MUED}/en/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${MUED}/ja/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${MUED}/en/tokushoho`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${MUED}/ja/tokushoho`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },

    // ── dial.mued.jp ─────────────────────────────────────────────
    { url: `${DIAL}/`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${DIAL}/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
  ];
}
