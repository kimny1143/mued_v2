import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { STORY_SLUGS } from '@/lib/story/articles';
import { ADVISORY_LIVE } from '@/lib/advisory/config';

// Force dynamic rendering so headers() can be read per-request
export const dynamic = 'force-dynamic';

const MUED = 'https://mued.jp';
const DIAL = 'https://dial.mued.jp';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const headersList = await headers();
  const host = headersList.get('host') ?? '';

  // dial.mued.jp: return dial-specific URLs only
  // Prevents GSC "indexed but not canonical" errors caused by mued.jp URLs
  // being served from dial.mued.jp/sitemap.xml
  if (host.includes('dial.mued.jp')) {
    return [
      { url: `${DIAL}/`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
      { url: `${DIAL}/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
      { url: `${DIAL}/waitlist`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
      { url: `${DIAL}/readiness`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
      { url: `${DIAL}/dial`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    ];
  }

  // mued.jp (default): return mued.jp URLs
  const storyPages: MetadataRoute.Sitemap = STORY_SLUGS.flatMap((slug) => [
    { url: `${MUED}/en/story/${slug}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${MUED}/ja/story/${slug}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.6 },
  ]);

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
    ...storyPages,
    ...(ADVISORY_LIVE
      ? [
          { url: `${MUED}/ja/advisory`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
          { url: `${MUED}/en/advisory`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
        ]
      : []),
  ];
}
