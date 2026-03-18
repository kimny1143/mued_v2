import type { SectionBlock } from "@/types/story";
import type { Locale } from "@/lib/i18n/config";

export const STORY_SLUGS = ["brain01", "brain02", "mued", "muedear", "hoo", "muedial", "why", "ear"] as const;
export type StorySlug = (typeof STORY_SLUGS)[number];

/* eslint-disable @typescript-eslint/no-require-imports */
const loaders: Record<StorySlug, Record<Locale, () => { sections: SectionBlock[] }>> = {
  brain01: {
    ja: () => require("@/content/stories/brain01/ja.json"),
    en: () => require("@/content/stories/brain01/en.json"),
  },
  brain02: {
    ja: () => require("@/content/stories/brain02/ja.json"),
    en: () => require("@/content/stories/brain02/en.json"),
  },
  mued: {
    ja: () => require("@/content/stories/mued/ja.json"),
    en: () => require("@/content/stories/mued/en.json"),
  },
  muedear: {
    ja: () => require("@/content/stories/muedear/ja.json"),
    en: () => require("@/content/stories/muedear/en.json"),
  },
  hoo: {
    ja: () => require("@/content/stories/hoo/ja.json"),
    en: () => require("@/content/stories/hoo/en.json"),
  },
  muedial: {
    ja: () => require("@/content/stories/muedial/ja.json"),
    en: () => require("@/content/stories/muedial/en.json"),
  },
  why: {
    ja: () => require("@/content/stories/why/ja.json"),
    en: () => require("@/content/stories/why/en.json"),
  },
  ear: {
    ja: () => require("@/content/stories/ear/ja.json"),
    en: () => require("@/content/stories/ear/en.json"),
  },
};
/* eslint-enable @typescript-eslint/no-require-imports */

export function getArticleSections(slug: StorySlug, locale: Locale = "ja"): SectionBlock[] {
  const slugLoaders = loaders[slug];
  if (!slugLoaders) return [];

  try {
    return slugLoaders[locale]().sections;
  } catch {
    return slugLoaders.ja().sections;
  }
}
