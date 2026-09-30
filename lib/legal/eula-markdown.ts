// The EULA draft (Markdown, owned by conductor) → the `eula` messages shape (lib/legal/eula-content.ts).
//
// ★A MACHINE conversion, on purpose: the text is a contract, so nobody retypes it. The same function
// runs again when the lawyer's version replaces the provisional one (1.0.1).
//
// The draft's shape (conductor docs/drafts/launch/eula-provisional-20260926/EULA-provisional-*.md):
//   # Title
//   Version …            ← optional (dsp's English text has none: the version lives in dsp's RTF
//                          generator). When present it must equal EULA_VERSION (checked by the caller).
//   Last updated / Effective date / 施行日 / 最終更新日: <date>  ← effectiveDate (the date) and dateLabel
//                          (the label AS WRITTEN), both verbatim — the same line
//                          dsp puts in the installer RTF (2026.10: "October 1, 2026" / 「2026年10月1日」).
//                          A placeholder like [DATE] is an error, never a date.
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
  /** From the "Version …" line when present — checked against EULA_VERSION by the caller, never rendered. */
  version?: string;
  /** From the date line ("Last updated:" / "Effective date:" / 「施行日:」), verbatim. */
  effectiveDate?: string;
  /** The date line's own label, verbatim ("Last updated" / 「最終更新日」…). ★The page shows THIS, so the
   *  web cannot call the governing text's "Last updated" an "Effective date" (CCO #1171 A). */
  dateLabel?: string;
  intro: EulaBlock[];
  articles: EulaArticle[];
}

const META_LINE = /^(Version |施行日[:：]|最終更新日[:：]|Effective date:|Last updated:)/;
const DATE_LINE = /^(施行日|最終更新日|Effective date|Last updated)[:：]\s*(.+)$/;
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
  let effectiveDate: string | undefined;
  let dateLabel: string | undefined;
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
      if (text.startsWith("Version ")) {
        version = text.slice("Version ".length).trim();
        return;
      }
      const date = text.match(DATE_LINE);
      if (!date) fail(n, "unrecognised metadata line");
      if (effectiveDate !== undefined) fail(n, "a second date line");
      dateLabel = date[1];
      effectiveDate = checkInline(date[2].trim(), n); // ★[DATE] fails here — never a date
      return;
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
  const empty = articles.find((a) => a.blocks.length === 0);
  if (empty) throw new Error(`[eula-markdown] article without text: ${empty.heading}`);
  return {
    title,
    ...(version === undefined ? {} : { version }),
    ...(effectiveDate === undefined ? {} : { effectiveDate }),
    ...(dateLabel === undefined ? {} : { dateLabel }),
    intro,
    articles,
  };
}
