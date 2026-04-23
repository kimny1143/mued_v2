import { MetadataRoute } from 'next';

const DIAL = 'https://dial.mued.jp';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: `${DIAL}/`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${DIAL}/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
  ];
}
