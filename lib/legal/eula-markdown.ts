// The EULA draft (Markdown, owned by conductor) → the `eula` messages shape (lib/legal/eula-content.ts).
//
// ★A MACHINE conversion, on purpose: the text is a contract, so nobody retypes it. The same function
// runs again when the lawyer's version replaces the provisional one (1.0.1).
//
// The draft's shape (conductor docs/drafts/launch/eula-provisional-20260926/EULA-provisional-*.md):
//   # Title
//   Version …            ← dropped: the version shown is EULA_VERSION (the one recorded at checkout)
//   施行日 / Effective date: …   ← dropped: effectiveDate is set only once decided (never "[発売日]")
//   intro paragraphs
//   ## N. Heading        ← one article each
//   paragraphs / "- " bullets / "1. " numbers
//
// ★Parsing is strict and THROWS on anything outside that shape (a nested list, a table, a Markdown
// link, a leftover [placeholder]): the renderer only understands **bold**, bare URLs/emails and
// line breaks, so anything else would ship as literal characters in a legal text.

import type { EulaArticle, EulaBlock } from "./eula-content";

export interface EulaMarkdown {
  title: string;
  /** From the "Version …" line — checked against EULA_VERSION by the caller, never rendered. */
  version: string;
  intro: EulaBlock[];
  articles: EulaArticle[];
}

const META_LINE = /^(Version |施行日[:：]|Effective date:)/;
const BULLET = /^- (.+)$/;
const NUMBERED = /^(\d+)\. (.+)$/;

function fail(line: number, message: string): never {
  throw new Error(`[eula-markdown] line ${line}: ${message}`);
}

function checkInline(text: string, line: number): string {
  if (/\]\(/.test(text)) fail(line, `Markdown link syntax is not rendered: ${JSON.stringify(text)}`);
  if (/\[[^\]]+\]/.test(text)) fail(line, `unfilled placeholder: ${JSON.stringify(text)}`);
  if (/<[a-z/]/i.test(text)) fail(line, `HTML is not rendered: ${JSON.stringify(text)}`);
  return text;
}

export function eulaFromMarkdown(md: string): EulaMarkdown {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let title: string | undefined;
  let version: string | undefined;
  const intro: EulaBlock[] = [];
  const articles: EulaArticle[] = [];
  const target = () => (articles.length ? articles[articles.length - 1].blocks : intro);

  // A block under construction: consecutive non-blank lines of the same kind.
  let para: string[] = [];
  let list: { kind: "ul" | "ol"; items: string[]; next: number } | null = null;
  const flush = () => {
    if (para.length) target().push(para.join("\n"));
    if (list) target().push(list.kind === "ul" ? { ul: list.items } : { ol: list.items });
    para = [];
    list = null;
  };

  lines.forEach((raw, i) => {
    const n = i + 1;
    const text = raw.trimEnd();
    if (text === "") return flush();
    if (/^\s/.test(raw)) fail(n, "indented line (nested list or code) is not supported");

    if (text.startsWith("# ")) {
      if (title !== undefined) fail(n, "a second title");
      title = checkInline(text.slice(2).trim(), n);
      return;
    }
    if (text.startsWith("## ")) {
      flush();
      articles.push({ heading: checkInline(text.slice(3).trim(), n), blocks: [] });
      return;
    }
    if (text.startsWith("#")) fail(n, "only # and ## headings are supported");
    if (/^(>|\||---|```)/.test(text)) fail(n, "blockquote / table / rule / code is not supported");

    if (!articles.length && META_LINE.test(text)) {
      flush();
      if (text.startsWith("Version ")) version = text.slice("Version ".length).trim();
      return; // the effective-date line is dropped (see header)
    }

    const bullet = text.match(BULLET);
    const numbered = text.match(NUMBERED);
    if (bullet || numbered) {
      const kind = bullet ? "ul" : "ol";
      const item = checkInline((bullet ? bullet[1] : numbered![2]).trim(), n);
      if (para.length || (list && list.kind !== kind)) flush();
      if (!list) list = { kind, items: [], next: 1 };
      if (numbered && Number(numbered[1]) !== list.next) fail(n, `numbered item ${numbered[1]}, expected ${list.next}`);
      list.items.push(item);
      list.next += 1;
      return;
    }
    if (list) fail(n, "a paragraph line directly after a list item (continuation lines are not supported)");
    para.push(checkInline(text, n));
  });
  flush();

  if (title === undefined) fail(1, "no # title");
  if (version === undefined) fail(1, "no Version line");
  const empty = articles.find((a) => a.blocks.length === 0);
  if (empty) throw new Error(`[eula-markdown] article without text: ${empty.heading}`);
  return { title, version, intro, articles };
}
