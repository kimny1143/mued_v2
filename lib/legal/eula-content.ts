// The shape of the EULA text in messages/{en,ja}.json (`eula.intro` / `eula.articles` / optional
// `eula.effectiveDate`), and the parsers that turn it into something the page can render.
//
// ★This is a CONTAINER. It holds no legal wording: the provisional EULA or the lawyer's final text is
// pasted into messages later, and either must render without a code change.
//
// ★Parsing is strict and THROWS. This is legal text: a clause silently dropped because it had a typo in
// its shape is worse than a failed build, because nobody reading the page can see what is missing.
// The page parses at render time and the pages are statically generated, so a malformed message
// fails `next build` instead of shipping.
//
// ★No HTML in messages. Inline markup is a deliberately tiny set (bold, links, line breaks) parsed
// into nodes, so the renderer never needs dangerouslySetInnerHTML.

/** A paragraph (plain string), a bulleted list, or a numbered list. */
export type EulaBlock = string | { ul: string[] } | { ol: string[] };

export interface EulaArticle {
  /** Carries its own number as the author wrote it ("1. Definitions" / "第1条（定義）"). */
  heading: string;
  blocks: EulaBlock[];
}

export interface EulaContent {
  intro: EulaBlock[];
  articles: EulaArticle[];
  /** Absent until a date is decided. ★Never an empty string: messages must not hold empty strings
   *  (tests/unit/lib/i18n/translations.test.ts), so "not set" is expressed by leaving the key out. */
  effectiveDate?: string;
  /** The source's own label for that date ("Last updated" / 「最終更新日」). Absent → the page's default. */
  dateLabel?: string;
}

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "link"; href: string; value: string }
  | { type: "break" };

function fail(path: string, message: string): never {
  throw new Error(`[eula] ${path}: ${message}`);
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") fail(path, `expected a non-empty string, got ${JSON.stringify(value)}`);
  return value;
}

function parseBlock(raw: unknown, path: string): EulaBlock {
  if (typeof raw === "string") return nonEmptyString(raw, path);
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    fail(path, `expected a string or { ul } / { ol }, got ${JSON.stringify(raw)}`);
  }
  const keys = Object.keys(raw);
  if (keys.length !== 1 || (keys[0] !== "ul" && keys[0] !== "ol")) {
    fail(path, `a list block has exactly one key, "ul" or "ol" (got ${JSON.stringify(keys)})`);
  }
  const kind = keys[0] as "ul" | "ol";
  const items = (raw as Record<string, unknown>)[kind];
  if (!Array.isArray(items) || items.length === 0) fail(`${path}.${kind}`, "expected a non-empty array of strings");
  const parsed = items.map((item, i) => nonEmptyString(item, `${path}.${kind}[${i}]`));
  return kind === "ul" ? { ul: parsed } : { ol: parsed };
}

function parseBlocks(raw: unknown, path: string): EulaBlock[] {
  if (!Array.isArray(raw)) fail(path, `expected an array, got ${JSON.stringify(raw)}`);
  return raw.map((block, i) => parseBlock(block, `${path}[${i}]`));
}

/** Validates `{ intro, articles, effectiveDate? }` read from messages. Empty arrays are valid (= not filled in yet). */
export function parseEulaContent(raw: { intro: unknown; articles: unknown; effectiveDate?: unknown; dateLabel?: unknown }): EulaContent {
  const effectiveDate = raw.effectiveDate === undefined ? undefined : nonEmptyString(raw.effectiveDate, "effectiveDate");
  const dateLabel = raw.dateLabel === undefined ? undefined : nonEmptyString(raw.dateLabel, "dateLabel");
  const intro = parseBlocks(raw.intro, "intro");
  if (!Array.isArray(raw.articles)) fail("articles", `expected an array, got ${JSON.stringify(raw.articles)}`);
  const articles = raw.articles.map((article, i): EulaArticle => {
    const path = `articles[${i}]`;
    if (typeof article !== "object" || article === null || Array.isArray(article)) fail(path, "expected { heading, blocks }");
    const { heading, blocks, ...rest } = article as Record<string, unknown>;
    if (Object.keys(rest).length) fail(path, `unknown keys ${JSON.stringify(Object.keys(rest))}`);
    const parsedBlocks = parseBlocks(blocks, `${path}.blocks`);
    if (parsedBlocks.length === 0) fail(`${path}.blocks`, "an article needs at least one block");
    return { heading: nonEmptyString(heading, `${path}.heading`), blocks: parsedBlocks };
  });
  return {
    intro,
    articles,
    ...(effectiveDate === undefined ? {} : { effectiveDate }),
    ...(dateLabel === undefined ? {} : { dateLabel }),
  };
}

// URL: https:// up to whitespace, minus trailing sentence punctuation (so "…/refund)." links to /refund).
// Email: the plain address form used in these texts (support@mued.jp).
const TOKEN = /(https:\/\/[^\s<>()（）]+[^\s<>()（）.,;:!?、。）)])|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

function linkify(text: string): InlineNode[] {
  const out: InlineNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const start = m.index ?? 0;
    if (start > last) out.push({ type: "text", value: text.slice(last, start) });
    const value = m[0];
    out.push({ type: "link", href: m[1] ? value : `mailto:${value}`, value });
    last = start + value.length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

/** Inline markup: `**bold**`, bare https URLs, bare email addresses, and `\n` line breaks. Nothing else. */
export function parseInline(text: string): InlineNode[] {
  const out: InlineNode[] = [];
  text.split("\n").forEach((line, lineIndex) => {
    if (lineIndex > 0) out.push({ type: "break" });
    // Split on paired ** only. An odd trailing ** has no partner and stays literal text.
    const parts = line.split("**");
    const paired = parts.length % 2 === 1 ? parts : [...parts.slice(0, -2), `${parts[parts.length - 2]}**${parts[parts.length - 1]}`];
    paired.forEach((part, i) => {
      if (part === "") return;
      if (i % 2 === 1) out.push({ type: "bold", value: part });
      else out.push(...linkify(part));
    });
  });
  // Merge adjacent text nodes so the output does not depend on where the split happened.
  return out.reduce<InlineNode[]>((acc, node) => {
    const prev = acc[acc.length - 1];
    if (node.type === "text" && prev?.type === "text") prev.value += node.value;
    else acc.push({ ...node });
    return acc;
  }, []);
}

/** Same-site links open in place; everything else in a new tab. */
export function isExternalHref(href: string): boolean {
  return href.startsWith("https://") && !/^https:\/\/(www\.)?mued\.jp(\/|$)/.test(href);
}
