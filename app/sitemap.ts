import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { STORY_SLUGS } from '@/lib/story/articles';
import { ADVISORY_LIVE } from '@/lib/advisory/config';
import { MUEDSAT_LIVE } from '@/lib/muedsat/config';
import { MUEDLIM_LIVE } from '@/lib/muedlim/config';
import { MUEDRIVE_LIVE } from '@/lib/muedrive/config';
import { MUEDSP_LIVE } from '@/lib/muedsp/config';
import { MUEDIAL_LP_LIVE } from '@/lib/muedial/config';
import { LEARN_LIVE } from '@/lib/learn/config';
import { LEARN_SLUGS } from '@/lib/learn/articles';

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
    ...(MUEDSAT_LIVE
      ? [
          { url: `${MUED}/ja/muedsat`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
          { url: `${MUED}/en/muedsat`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
        ]
      : []),
    ...(MUEDLIM_LIVE
      ? [
          { url: `${MUED}/ja/muedlim`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
          { url: `${MUED}/en/muedlim`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
        ]
      : []),
    ...(MUEDRIVE_LIVE
      ? [
          { url: `${MUED}/ja/muedrive`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
          { url: `${MUED}/en/muedrive`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
        ]
      : []),
    ...(MUEDSP_LIVE
      ? [
          { url: `${MUED}/ja/muedsp`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
          { url: `${MUED}/en/muedsp`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
        ]
      : []),
    ...(MUEDIAL_LP_LIVE
      ? [
          { url: `${MUED}/ja/muedial`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
          { url: `${MUED}/en/muedial`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
        ]
      : []),
    // /learn — EN reference track (non-locale, EN-only). Staged until LEARN_LIVE (kimny go-live gate).
    ...(LEARN_LIVE
      ? [
          { url: `${MUED}/learn`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.6 },
          ...LEARN_SLUGS.map((slug) => ({
            url: `${MUED}/learn/${slug}`,
            lastModified: now,
            changeFrequency: 'monthly' as const,
            priority: 0.6,
          })),
        ]
      : []),
  ];
}
