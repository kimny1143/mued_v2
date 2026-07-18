//
// /learn — EN evergreen reference track (Road to 10k 層2 #8). The content-data seam over the seed
// markdown in `content/learn/*.md`: each file is YAML frontmatter (meta + a structured `gate` object —
// the 1-hop CTA to /muedsp) followed by the markdown body. content課 authors the .md (frontmatter is
// the canonical source of meta; `_handoff-meta.md` is a human summary, not parsed). mued renders.
//
// EN-only by design: this lives on the NON-locale route app/learn (like app/dial, app/muedear), so the
// JA face / next-intl locale tree is never touched (JA非侵食). Read at build (SSG) — the route is fully
// static (dynamicParams=false), so no runtime fs.
//
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export const LEARN_SLUGS = [
  "what-is-lufs",
  "lufs-targets-streaming",
  "true-peak-vs-sample-peak",
  "set-true-peak-ceiling",
] as const;
export type LearnSlug = (typeof LEARN_SLUGS)[number];

/** The 1-hop gate CTA at the foot of every article — a structured frontmatter object (content owns copy). */
export interface LearnGate {
  heading: string;
  body: string;
  note?: string; // ownership-framing line (email = your portal), common across articles
  ctaLabel: string;
  ctaHref: string; // /muedsp (the DL entry — a forwarded/new reader lands and downloads)
}

export interface LearnArticle {
  slug: LearnSlug;
  title: string; // H1 (rendered from frontmatter — the body carries no `# H1`, so no double heading)
  seoTitle: string; // <title>
  description: string; // meta description
  tags: string[];
  publishDate: string | null; // null until published
  lastUpdated: string | null;
  gate: LearnGate;
  body: string; // markdown (frontmatter stripped; gate is NOT duplicated here)
}

const LEARN_DIR = path.join(process.cwd(), "content", "learn");

function isLearnSlug(slug: string): slug is LearnSlug {
  return (LEARN_SLUGS as readonly string[]).includes(slug);
}

/** Load + parse one article. Returns null for an unknown slug (route → notFound). `_ops` is ignored. */
export function getLearnArticle(slug: string): LearnArticle | null {
  if (!isLearnSlug(slug)) return null;
  const raw = fs.readFileSync(path.join(LEARN_DIR, `${slug}.md`), "utf8");
  const { data, content } = matter(raw);
  const gate = (data.gate ?? {}) as LearnGate;
  return {
    slug,
    title: String(data.title ?? ""),
    seoTitle: String(data.seoTitle ?? data.title ?? ""),
    description: String(data.description ?? ""),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    publishDate: data.publishDate ?? null,
    lastUpdated: data.lastUpdated ?? null,
    gate: {
      heading: String(gate.heading ?? ""),
      body: String(gate.body ?? ""),
      note: gate.note ? String(gate.note) : undefined,
      ctaLabel: String(gate.ctaLabel ?? ""),
      ctaHref: String(gate.ctaHref ?? "/muedsp"),
    },
    body: content.trim(),
  };
}

/** All articles in slug order — for the /learn index + sitemap. */
export function getAllLearnArticles(): LearnArticle[] {
  return LEARN_SLUGS.map((s) => getLearnArticle(s)).filter((a): a is LearnArticle => a !== null);
}
