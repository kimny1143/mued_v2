import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEulaContent } from "@/lib/legal/eula-content";
import { eulaFromMarkdown } from "@/lib/legal/eula-markdown";
import { createHash } from "node:crypto";

const ROOT = process.cwd();
const PAGE = join(ROOT, "app", "[locale]", "eula", "page.tsx");

function leafKeyPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    leafKeyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("staged EULA page", () => {
  it.each(["ja", "en"] as const)("exists for %s and carries the EULA text — no placeholder copy left", (locale) => {
    expect(existsSync(PAGE)).toBe(true);
    const page = readFileSync(PAGE, "utf8");
    const messages = JSON.parse(readFileSync(join(ROOT, "messages", `${locale}.json`), "utf8"));

    expect(page).toContain('useTranslations("eula")');
    expect(page).toContain("locales.map((locale) => ({ locale }))");
    // ★Exactly the four keys the page reads. The staging placeholder (lastUpdated / sections) was
    //   removed with the provisional text (2026-09-30); it was not rendered, but it still shipped in
    //   the page payload, and a legal page should not carry "this is a placeholder" in any form.
    // 2026.10 (lawyer draft, 2026-09-30): the English text governs and /ja carries a reference note.
    //   effectiveDate is the date line of the source text (dsp's "Last updated:" = 2026-10-01).
    expect(Object.keys(messages.eula).sort()).toEqual(["articles", "effectiveDate", "intro", "referenceNote", "title"]);
    expect(messages.eula.articles.length).toBeGreaterThan(0);
    expect(JSON.stringify(messages.eula).toLowerCase()).not.toMatch(/プレースホルダー|placeholder/);
    // ★Empty text fails the static build instead of rendering a fallback.
    expect(page).toContain("the EULA page must not render without its text");
    expect(page).not.toContain("PlaceholderSections");
  });

  it("★2026.10: the English text governs; /ja shows the reference note; effective 2026-10-01 as in dsp's RTF", () => {
    // Version 2026.10 is the lawyer's draft (2026-09-30) staged for the release PR. The same version
    //   string must mean the same text as dsp's installer RTF, so EULA_VERSION moves with dsp.
    const load = (l: string) => JSON.parse(readFileSync(join(ROOT, "messages", `${l}.json`), "utf8")).eula;
    // kimny 2026-09-30: effective 2026-10-01. The EN string is what dsp puts in the RTF's [DATE].
    expect(load("en").effectiveDate).toBe("October 1, 2026");
    expect(load("ja").effectiveDate).toBe("2026年10月1日");
    expect(load("ja").referenceNote).toContain("英語版が優先します");
    const page = readFileSync(PAGE, "utf8");
    expect(page).toContain('data-testid="eula-reference-note"');
    expect(page).toMatch(/\{isJa && \(\s*<p data-testid="eula-reference-note"/);
  });

  it("keeps the Japanese and English EULA key sets identical", () => {
    const ja = JSON.parse(readFileSync(join(ROOT, "messages", "ja.json"), "utf8")).eula;
    const en = JSON.parse(readFileSync(join(ROOT, "messages", "en.json"), "utf8")).eula;

    expect(leafKeyPaths(ja).sort()).toEqual(leafKeyPaths(en).sort());
  });

  it("★carries the article container in both locales, parses, and keeps ja/en in step", () => {
    const load = (l: string) => JSON.parse(readFileSync(join(ROOT, "messages", `${l}.json`), "utf8")).eula;
    const ja = load("ja");
    const en = load("en");
    for (const e of [ja, en]) {
      // ★Absent until decided — never "" (messages hold no empty strings; see translations.test.ts).
      if ("effectiveDate" in e) expect(e.effectiveDate.trim()).not.toBe("");
      expect(Array.isArray(e.intro)).toBe(true);
      expect(Array.isArray(e.articles)).toBe(true);
      // The real messages must parse — the page does the same at build time.
      expect(() => parseEulaContent(e)).not.toThrow();
    }
    // ★A clause present in one language only must fail here, not ship.
    expect(ja.articles.length).toBe(en.articles.length);
    expect(ja.intro.length).toBe(en.intro.length);
  });

  it("★keeps ja/en in step inside each article: block kinds, block count and list item counts", () => {
    // Article count alone lets a dropped bullet or a merged paragraph through in one language
    // (CCO review of #1134, finding B). The Japanese text prevails (art. 15), so a one-sided
    // difference is a difference in the contract, not in wording.
    const load = (l: string) => JSON.parse(readFileSync(join(ROOT, "messages", `${l}.json`), "utf8")).eula;
    type Block = string | { ul: string[] } | { ol: string[] };
    const shape = (blocks: Block[]) =>
      blocks.map((b) => (typeof b === "string" ? "p" : "ul" in b ? `ul:${b.ul.length}` : `ol:${b.ol.length}`));
    const [ja, en] = [load("ja"), load("en")];
    expect(shape(ja.intro)).toEqual(shape(en.intro));
    ja.articles.forEach((article: { heading: string; blocks: Block[] }, i: number) => {
      expect(shape(article.blocks), `${article.heading} ↔ ${en.articles[i]?.heading}`).toEqual(
        shape(en.articles[i].blocks),
      );
    });
  });

  it("renders from parsed nodes, never raw HTML", () => {
    const page = readFileSync(PAGE, "utf8");
    const body = readFileSync(join(ROOT, "components", "legal", "eula-body.tsx"), "utf8");
    for (const src of [page, body]) expect(src).not.toContain("dangerouslySetInnerHTML");
    expect(page).toContain("parseEulaContent(");
    // ★The version shown is the one recorded at checkout, not a second copy in messages.
    expect(page).toContain('import { EULA_VERSION } from "@/lib/legal/eula"');
  });

  it("mirrors /learn staging: noindex before live and sitemap inclusion only after live", () => {
    const page = readFileSync(PAGE, "utf8");
    const sitemap = readFileSync(join(ROOT, "app", "sitemap.ts"), "utf8");
    const config = readFileSync(join(ROOT, "lib", "legal", "config.ts"), "utf8");

    expect(config).toContain('process.env.EULA_LIVE === "1"');
    expect(page).toContain("robots: { index: EULA_LIVE, follow: EULA_LIVE }");
    expect(sitemap).toContain("...(EULA_LIVE");
    expect(sitemap).toContain("`${MUED}/en/eula`");
    expect(sitemap).toContain("`${MUED}/ja/eula`");
  });

  it("uses a documented build-inlined public flag for the client consent gate", () => {
    const control = readFileSync(
      join(ROOT, "components", "features", "muedsp-landing", "masterchain-purchase-control.tsx"),
      "utf8",
    );

    expect(control).toContain('process.env.NEXT_PUBLIC_EULA_LIVE === "1"');
    expect(control).not.toContain("process.env.EULA_LIVE");
    expect(control).toContain("Client gate: NEXT_PUBLIC_EULA_LIVE");
  });
});

describe("★EULA 2026.10 — the web text IS dsp's installer text", () => {
  // dsp #845 (mued-dsp plugin/_shared/eula/EULA-en.md): the English text the installer RTF is built from.
  //   docs/legal/eula/EULA-2026.10-en.md is a byte copy of it. ★Update this pin only together with a
  //   fresh byte copy, after comparing with the sha dsp sends for its merged file.
  const DSP_EULA_EN_SHA256 = "e7e222479867f7877ac35100291713d5d58405a12491f05e126ada2b80f97a2e"; // dsp #845 head 3b4fba76

  it("the English source is the pinned byte copy of dsp's EULA-en.md", () => {
    const md = readFileSync(join(ROOT, "docs", "legal", "eula", "EULA-2026.10-en.md"));
    expect(createHash("sha256").update(md).digest("hex")).toBe(DSP_EULA_EN_SHA256);
  });

  it.each(["en", "ja"] as const)("messages.%s.eula is exactly the conversion of its source (nobody hand-edited it)", (locale) => {
    const md = readFileSync(join(ROOT, "docs", "legal", "eula", `EULA-2026.10-${locale}.md`), "utf8");
    const draft = eulaFromMarkdown(md);
    const eula = JSON.parse(readFileSync(join(ROOT, "messages", `${locale}.json`), "utf8")).eula;
    expect(eula.title).toBe(draft.title);
    expect(eula.effectiveDate).toBe(draft.effectiveDate);
    expect(eula.intro).toEqual(draft.intro);
    expect(eula.articles).toEqual(draft.articles);
  });
});
