import { MetadataRoute } from 'next';

const MUED = 'https://mued.jp';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: `${MUED}/en`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${MUED}/ja`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${MUED}/connect`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${MUED}/en/support`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${MUED}/ja/support`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${MUED}/en/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${MUED}/ja/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${MUED}/en/tokushoho`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${MUED}/ja/tokushoho`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
